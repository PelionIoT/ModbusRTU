var SerialCommInterface = require('./l1-serialCommInterface');
var Logger = require('./../utils/logger');
var Message = require('./../utils/message');
var DataFrame = require('./../utils/dataFrame');

var logger = new Logger( { moduleName: 'Transport', color: 'cyan'} );

var ACK_TIMEOUT = 300; //ms
var THROTTLE_RATE = 100; //ms

// flow control, streaming, etc on transport layer
// this layer should send a message, handle resends and acks
// flow control: make sure messages are serialized
var Transport = function(options) {

	if(typeof options === 'undefined') {
		options = {};
	}

	//constants
	this._ackWaitTimeperiod = options.requestAckTimeout || ACK_TIMEOUT; //msecond, the transmitter MUST wait for at least 1600ms before deeming the Data frame lost.
	this._serialInterfaceOptions = options.serialInterfaceOptions;

	this._serialComm = null;

	//Queue for outgoing messages
	this._txQueue = [];

	//utils for indivdual transmissions
	this._ackTimeout = null;
	this._inProgress = false;

	this._waitBeforeTransmit = options.throttleRate || THROTTLE_RATE; //100ms wait before retransmit, giving enough time for the response to finish as it causes CAN frame

    this._msgId = 0;
    this._defaultResponseTimeout = 1000; //ms

    this._validResponses = 0;
    this._requestTimeouts = 0;
    this._requests = 0;
    this._crcErrors = 0;
    this._unresponsiveErrors = 0;
    this._invalidResponseLength = 0;
    this._duplicates = 0;
}

Transport.prototype.start = function() {
	var self = this;

	return new Promise(function(resolve, reject) {
		self._serialComm = new SerialCommInterface(self._serialInterfaceOptions);
		self._serialComm.start().then(function() {
			logger.info('Started successfully with ' + JSON.stringify(self._serialInterfaceOptions));
			resolve();
		}, function(err) {
			logger.error('Failed with error '+ err);
			reject(err);
		});

		self._serialComm.on('data', function(data) {
			self.handleDataFrame(data);
		});
	});
}

Transport.prototype.stop = function() {
	return this._serialComm.close();
}

Transport.prototype.getNextMsgId = function() {
    return (this._msgId++ & 0xFFFF);
};

Transport.prototype.send = function(msg, cb) {
    if(!(msg instanceof Message)) {
        throw new TypeError('message should be of Message type');
    }

    //Check if the similar msg is in the queue, if it is then dequeue that and add this to the back of the queue
    var found;
    try {
        found = this._txQueue.find(function(element) { return ((element._requestType === msg._requestType) && (!element.waitingForResponse())); });
    } catch(e) {
        logger.error('Failed to search transmit queue ' + e);
        cb('Failed to search tx queue ' + e, null);
        return;
    }

    if(found) {
        logger.warn('Found same request type queued- ' + found._requestType + ', dequeuing old message ' + found._msgId);
        try {
            this._duplicates++;
            var req = this._txQueue.splice(this._txQueue.indexOf(found), 1)[0];
            if(req._promise) req._promise.reject(new Error('New request of same type just arrived so not serving.'));
        } catch(e) {
            logger.error('Failed to dequeue ' + e + JSON.stringify(e));
        }
    }

    if(typeof cb === 'function') {
        msg.respCB(cb);
        msg.respTimeout(this._defaultResponseTimeout);
    } else {
        // logger.warn('cb assigned is not a function');
    }

    msg.msgId(this.getNextMsgId());

    logger.debug('Msg' + msg._msgId + ' added message To TX Queue ' + JSON.stringify(msg));
    this._txQueue.push(msg);
    this._requests++;

    this.startSendSequence(msg.msgId());
};

Transport.prototype.startSendSequence = function(msgId) {
    var self = this;

    if(!this._inProgress) {
	    if(!this._ackTimeout && this._txQueue.length > 0) {
            var buffer;
            try {
	    	  buffer = this._txQueue[0]._request.toBuffer();
            } catch(e) {
                logger.error('Failed to convert request to buffer ' + e);
                this.completeSendSequence(new Error('Failed to convert request to buffer ' + e));
                return;
                //Dequeue this packet
            }
	    	logger.info('Msg' + this._txQueue[0]._msgId + ' ' + this._txQueue[0]._description + ' start send sequence ' + buffer.toString('hex'));

            //This msg is in progress
            this._txQueue[0].waitingForResponse(true);         

	        this.sendDataFrame(buffer);
	        this._inProgress = true;

	        this._ackTimeout = setTimeout(function() {
	        	logger.warn('Did not receive response for tx msg ' + self._txQueue[0]._msgId + ', timing out');
	            self.handleNakFrame();
	        }, this._ackWaitTimeperiod);
	    }
	}
    else {
    	logger.debug('In progress... Msg ' + msgId + ' send deferred');
    }
};

Transport.prototype.completeSendSequence = function(err, incomingData) {
	var self = this;
    var msg = this._txQueue.shift(); //FIFO

    if(msg) {
        logger.trace('Msg' + msg._msgId + ' complete send sequence ' + JSON.stringify(msg));
        msg.waitingForResponse(false);
        try {
            if(err) {
                if(msg._promise) msg._promise.reject(err);
            } else {
                // if(msg._promise) msg._promise.resolve();
                self.handleResponse(msg, incomingData);
            }
        } catch(e) {
            // log error, doesn't really matter to this layer
            // we just don't want to crash anything here
           	logger.error('Msg' + msg._msgId + ' request callback error ' + e);
            if(msg._promise) msg._promise.reject(e);
        }
    } else {
        logger.warn('Could not find any message in the txQueue to completeSendSequence');
    }

    logger.trace('Proceed to next msg send');

    clearTimeout(this._ackTimeout);
    delete this._ackTimeout;
    this._serialComm.flush();

    setTimeout(function() {
	    self._inProgress = false;
	    self.startSendSequence();
    }, self._waitBeforeTransmit);
};

//FIFO so we look for the first msg which matches the command
Transport.prototype.handleResponse = function(msg, frame) {
    if(!(frame instanceof DataFrame)) {
        throw new TypeError('incoming response should be of DataFrame type');
    }

    if(!!msg) {
        logger.info('Msg' + msg._msgId + ' got response ' + frame.getOriginalBuffer().toString('hex'));
        if(frame._length == 5 && frame._funcCode == (0x80 | msg.respCode())) {
            if(msg._promise) msg._promise.reject(new Error('Modbus Bad Response ' + frame.getException()));
            return;
        }
        //Do sanity check of the response
        if(msg.respLength() !== 0 && frame._length != msg.respLength()) {
            if(msg._promise) msg._promise.reject(new Error('Data length error, expected ' + msg.respLength() + ' got ' + frame._length));
            return;
        }

        msg.response(frame);
        if(msg._respRequired) {
            msg._respCB(null, msg);
        } else if(msg._promise) {
            msg._promise.resolve(msg);
        } else {
            logger.error('No response handler for this msg ' + msg._msgId);
        }
    } else {
        logger.warn('Received response for no request, not possible on Modbus');
    }
};


Transport.prototype.retransmit = function() {
    var self = this;

    if(this._txQueue[0]._retries-- > 0) {
        logger.debug('Retry request left ' + this._txQueue[0]._retries);
        clearTimeout(self._ackTimeout);
        delete self._ackTimeout; // get rid of this so resend will occur
        self._inProgress = false;
        self.startSendSequence();
    } else {
        this.onUnresponsiveError();
    }
};

Transport.prototype.handleResponseFrame = function(incomingData) {
    // ready to send next data frame if necessary
    this.completeSendSequence(null, incomingData);
};

Transport.prototype.handleNakFrame = function() {
    // may need to resend data frame
    this._requestTimeouts++;
    this.retransmit();
};

// buffer should exclude first SOF byte
Transport.prototype.handleDataFrame = function(buffer) {
	logger.debug('Incoming dataframe- '+ buffer.toString('hex'));

	var incomingData = new DataFrame(buffer);
	// logger.info('Incoming frame ' + JSON.stringify(incomingData));
	if(incomingData.isValidLength() && incomingData.isValidChecksum()) {
        this._validResponses++;
		this.handleResponseFrame(incomingData);
	} else {
		if(!incomingData.isValidChecksum()) {
			this.onCRCError();
		}
		if(!incomingData.isValidLength()) {
            this.onInvalidResponseLength();
		}
	}
};

Transport.prototype.onCRCError = function() {
    logger.error('Received response CRC Error');
    this._crcErrors++;
    this.completeSendSequence(new Error('Received response CRC Error!'));
};

Transport.prototype.onInvalidResponseLength = function() {
    logger.error('Received response with invalid length < 5');
    this._invalidResponseLength++;
    this.completeSendSequence(new Error('Received response with invalid length < 5!'));
};

Transport.prototype.onUnresponsiveError = function() {
    this._unresponsiveErrors++;
    this.completeSendSequence(new Error('Did not receive response!'));
};

Transport.prototype.sendDataFrame = function(buffer) {
    this._serialComm.write(buffer, function(err) {
        if(err) {
        	logger.error('sendDataFrame failed with error- '+ err);
        	return;
        }
    });
};


Transport.prototype.queueLength = function() {
    return this._txQueue.length;
};

Transport.prototype.getCurrentMsgId = function() {
    return this._msgId;
};

Transport.prototype.flush = function() {
    this._txQueue.splice(1, this._txQueue.length);
    return;
};

//Utils for testing
Transport.prototype.getQueue = function() {
	return this._txQueue;
};

Transport.prototype.getTotalValidResponsesRecevied = function() {
	return this._validResponses;
};

Transport.prototype.getTotalResponses = function() {
    return this._validResponses;
};

Transport.prototype.getTotalNoResponsesRecevied = function() {
	return this._requestTimeouts;
};

Transport.prototype.getTotalRequestSent = function() {
	return this._requests;
};

Transport.prototype.getTotalCrcErrors = function() {
    return this._crcErrors;
};

Transport.prototype.getTotalUnresponsiveErrors = function() {
    return this._unresponsiveErrors;
};

Transport.prototype.getTotalInvalidLengthErrors = function() {
    return this._invalidResponseLength;
};

Transport.prototype.getTotalDuplicates = function() {
    return this._duplicates;
};

Transport.prototype.getStatus = function() {
    return {
        processedRequests: this.getTotalRequestSent(),
        validResponses: this.getTotalResponses(),
        queueLength: this.queueLength(),
        unresponsiveErrors: this.getTotalUnresponsiveErrors(),
        invalidLengthErrors: this.getTotalInvalidLengthErrors(),
        crcErrors: this.getTotalCrcErrors(),
        requestTimeouts: this.getTotalNoResponsesRecevied(),
        duplicates: this.getTotalDuplicates()
    }
}

module.exports = Transport;