var SerialCommInterface = require('./l1-serialCommInterface');
var Logger = require('./../utils/logger');
var Message = require('./../utils/message');
var DataFrame = require('./../utils/dataFrame');

var logger = new Logger( { moduleName: 'Transport', color: 'cyan'} );

var MAX_TRANSPORT_RETRANSMIT = 3;
var ACT_TIMEOUT = 1000; //ms

// flow control, streaming, etc on transport layer
// this layer should send a message, handle resends and acks
// flow control: make sure messages are serialized
var Transport = function(options) {

	if(typeof options === 'undefined') {
		options = {};
	}
	this._incomingDataFrameCB = options.incomingDataFrameCB;

	//constants
	this._maxTransportRetransmit = options.maxTransportRetries || MAX_TRANSPORT_RETRANSMIT;
	this._ackWaitTimeperiod = options.responseTimeout || ACT_TIMEOUT; //msecond, the transmitter MUST wait for at least 1600ms before deeming the Data frame lost.
	this._serialInterfaceOptions = options.serialInterfaceOptions;

	this._serialComm = null;
	
	//Queue for outgoing messages
	this._txQueue = [];
	
	//utils for indivdual transmissions
	this._ackTimeout = null;
	this._resendCount = 0;
	this._inProgress = false;

	this._waitBeforeTransmit = 100; //100ms wait before retransmit, giving enough time for the response to finish as it causes CAN frame
}

Transport.prototype.start = function(options) {
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

Transport.prototype.send = function(msg) {
    if(!(msg instanceof Message)) {
        throw new TypeError('message should be of Message type');
    }

    logger.debug('Msg' + msg._msgId + ' added message To TX Queue ' + JSON.stringify(msg));
    this._txQueue.push(msg);

    this.startSendSequence();
};

Transport.prototype.handleIncomingData = function(buffer) {
	console.log('data ', buffer);
};

Transport.prototype.assignIncomingDataFrameCB = function(cb) {
	if(typeof cb === 'function')
		this._incomingDataFrameCB = cb
}

/* Data frame delivery timeout
A host or Z-Wave chip MUST wait for an ACK frame after transmitting a Data frame.
The receiver may be waiting for up to 1500ms for the remains of a corrupted frame
Therefore, the transmitter MUST wait for at least 1600ms before deeming the Data frame lost.
The loss of a Data frame MUST be treated as the reception of a NAK frame
The transmitter MAY compensate for the 1600ms already elapsed when calculating the retransmission
waiting period.
*/
Transport.prototype.startSendSequence = function() {
    var self = this;

    if(!this._inProgress) {
	    if(!this._ackTimeout && this._txQueue.length > 0) {
	    	var buffer = this._txQueue[0]._request.toBuffer();
	    	logger.debug('Msg' + this._txQueue[0]._msgId + ' ' + this._txQueue[0]._description + ' start send sequence ' + buffer.toString('hex'));

	        this.sendDataFrame(buffer);
	        this._inProgress = true;

	        this._ackTimeout = setTimeout(function() {
	        	logger.warn('Did not receive response for tx msg, timing out');
	            self.handleNakFrame();
	        }, this._ackWaitTimeperiod);
	    }
	}
    else {
    	logger.info('Msg' + this._txQueue[this._txQueue.length - 1]._msgId + ' ' + this._txQueue[this._txQueue.length - 1]._description + ' send deferred');
    }
};

Transport.prototype.completeSendSequence = function(e) {
	var self = this;
    var msg = this._txQueue.shift(); //FIFO

    this._resendCount = 0;
    // logger.debug('Msg' + msg._msgId + ' ' + msg._description + ' complete send sequence');
    logger.trace('Msg' + msg._msgId + ' complete send sequence ' + JSON.stringify(msg));

    logger.debug('Proceed to next msg send');
    // this will cause it to continue to send queued commands
    clearTimeout(this._ackTimeout);
    delete this._ackTimeout;

    try {
        logger.debug('Msg' + msg._msgId + ' call message callback, error- ' + e);
        msg._reqCB(msg._msgId, e);
    }
    catch(err) {
        // log error, doesn't really matter to this layer
        // we just don't want to crash anything here
       	logger.error('Msg' + msg._msgId + ' request callback error ' + err);
    }

    setTimeout(function() {
	    self._inProgress = false;
	    self.startSendSequence();
    }, self._waitBeforeTransmit);
};

//Retransmission
/*
A transmitter may time out waiting for an ACK frame after transmitting a Data frame or it may receive a
NAK or a CAN frame. In either case, the transmitter SHOULD retransmit the Data frame.
A waiting period MUST be applied before the retransmission.
The waiting period MUST be calculated per the following formula:
T waiting = 100ms + n*1000ms
where n is incremented at each retransmission.
n=0 is used for the first waiting period.
A host or Z-Wave chip MUST NOT carry out more than 3 retransmissions. 

It should be noted that a host
MAY choose to do a hard reset of the Z-Wave module if it is not able to do a successful frame delivery
after 3 retransmissions. It is also recommended to flush/reopen the serial port after the 3
retransmissions.
*/
Transport.prototype.retransmit = function() {
    var self = this;

    if(this._resendCount == this._maxTransportRetransmit) {
    	logger.error('Retransmission failed after ' + this._resendCount + ' retries');
        this.onUnresponsiveError();
    }
    else {
        // var waitTimeout = 100 + 1000*this._resendCount;

        // logger.warn('Backing off for ' +  waitTimeout + 'ms before resend');
        // this.resendWaitTimeout = setTimeout(function() {
            logger.debug('Restart send sequence'+ self._resendCount);
            clearTimeout(self._ackTimeout);
            delete self._ackTimeout; // get rid of this so resend will occur
            // setTimeout(function() {
			    self._inProgress = false;
			    self.startSendSequence();
		    // }, self._waitBeforeTransmit);
        // }, waitTimeout);

        this._resendCount += 1;
    }
};

Transport.prototype.handleAckFrame = function() {
    // ready to send next data frame if necessary
    this.completeSendSequence();
};

Transport.prototype.handleNakFrame = function() {
    // may need to resend data frame
    this.retransmit();
};

// buffer should exclude first SOF byte
Transport.prototype.handleDataFrame = function(buffer) {
	logger.debug('Incoming dataframe- '+ buffer.toString('hex'));

	var incomingData = new DataFrame(buffer);
	// logger.info('Incoming frame ' + JSON.stringify(incomingData));
	if(incomingData.isValidLength() && incomingData.isValidChecksum()) {
		this.handleAckFrame();
		if(typeof this._incomingDataFrameCB === 'function') {
			this._incomingDataFrameCB(incomingData);
		}
	} else {
		if(!incomingData.isValidChecksum()) {
			this.onCRCError();
		}
		if(!incomingData.isValidLength()) {
			logger.error('Received frame with invalid length < 5');
		}
	}
};

Transport.prototype.handleInvalidMessageType = function(messageType) {
    // just log error for now
    logger.error('RX ----- Invalid Frame Type ' + messageType);
};

/*Persistent CRC error
If a host application detects an invalid checksum three times in a row when receiving data frames,
the host application SHOULD invoke a hard reset of the device. If a hard reset line is not available,
a soft reset indication SHOULD be issued for the device.
*/
Transport.prototype.onCRCError = function() {
    this._consecutiveCRCErrors += 1;

    logger.error('CRC Error');
    if(this._consecutiveCRCErrors == 3) {
    	//TODO - implement hard reset and soft reset

        logger.error('Three Consectutive CRC Errors');
        this._consecutiveCRCErrors = 0;
    }
};

Transport.prototype.onUnresponsiveError = function() {
    // A host or Z-Wave chip MUST NOT carry out more than 3 retransmissions. It should be noted that a host
    // MAY choose to do a hard reset of the Z-Wave module if it is not able to do a successful frame delivery
    // after 3 retransmissions. It is also recommended to flush/reopen the serial port after the 3
    // retransmissions.

    // logger.error('onUnresponsiveError')
    this._serialComm.flush();
    this.completeSendSequence(new Error('Did not receive ack'));
};

Transport.prototype.sendDataFrame = function(buffer) {
    this._serialComm.write(buffer, function(err) {
        if(err) {
        	logger.error('sendDataFrame failed with error- '+ err);
        	return;
        }
    });
};

//Utils for testing
Transport.prototype.getQueue = function() {
	return this._txQueue;
}

Transport.prototype.getTotalAckFramesRecevied = function() {
	//not yet implemented
}

Transport.prototype.getTotalCanFramesRecevied = function() {
	//not yet implemented
}

Transport.prototype.getTotalNakFramesRecevied = function() {
	//not yet implemented
}

Transport.prototype.getTotalDataFramesRecevied = function() {
	//not yet implemented
}

Transport.prototype.getTotalRequestSent = function() {
	//not yet implemented
}

Transport.prototype.getTotalIncomingDataFrames = function() {
	//not yet implemented
}

Transport.prototype.getTotalFailures = function() {
	//not yet implemented
}

Transport.prototype.getTotalBackOffs = function() {
	//not yet implemented
}

Transport.prototype.getTotalAckFramesSent = function() {
	//not yet implemented
}

Transport.prototype.getTotalCanFramesSent = function() {
	//not yet implemented
}

Transport.prototype.getTotalNakFramesSent = function() {
	//not yet implemented
}

module.exports = Transport;