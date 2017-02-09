var Message = require('./../utils/message');
var DataFrame = require('./../utils/dataFrame');
var Logger = require('./../utils/logger');
var Transport = require('./l2-transport');
var EventEmitter = require('events').EventEmitter;

var logger = new Logger( { moduleName: 'Messenger', color: 'blue'} );

var Messenger = function(options) {

	if(typeof options === 'undefined') {
		options = {};
	}
	this._defaultResponseTimeout = 1000; //ms
	this._queue = [];
	this._msgId = 0;
	this._seqId = 0;
	this._transport = null;
};

Messenger.prototype = Object.create(EventEmitter.prototype);

Messenger.prototype.start = function(options) {
	var self = this;

	function responseCB(msg, frame) {
		self.handleResponse(msg, frame);
	}

	function progressCB(msgId) {
		self.inProgress(msgId);
	}

	return new Promise(function(resolve, reject) {
		self._transport = new Transport(options);
		self._transport.start(options).then(function() {
			logger.info('Started successfully');
			self._transport.assignIncomingDataFrameCB(responseCB);
			self._transport.assignProgressReportCB(progressCB);
			resolve();
		}, function(err) {
			logger.error('Failed with error '+ err);
			reject(err);
		});
	});
};

Messenger.prototype.getNextSeqId = function() {
	return (this._seqId++ & 0xFFFF);
};

Messenger.prototype.getNextMsgId = function() {
	return (this._msgId++ & 0xFFFF);
};

Messenger.prototype.push = function(msg, cb) {
	var self = this;

	//Check if the similar msg is in the queue, if it is then dequeue that and add this to the back of the queue
	var found = self._queue.find(function(element) { return ((element._requestType === msg._requestType) && (!element.waitingForResponse())); });
	if(found) {
		logger.warn('Found same request type queued- ' + found._requestType + ', dequeuing old message ' + found._msgId);
		self._transport.dequeueRequest(found._msgId);
		self.callResponseCB(found, new Error('Request cancelled, found duplicate!'));
	}

	if(typeof cb === 'function') {
		msg.respCB(cb);
		msg.respTimeout(this._defaultResponseTimeout);
	} else {
		logger.warn('cb assigned is not a function');
	}

	// function requestCB(msgId, err) {
	// 	self.requestFrameCB(msgId, err);
	// }

	msg.msgId(this.getNextMsgId());

	logger.trace('Added msg ' + msg._msgId + ' requestType ' + msg._requestType + ' response length ' + msg.respLength());

	// msg.callback(requestCB);
	this._queue.push(msg);

	logger.debug('Msg' + msg._msgId + ' pushed to the queue successfully');
	return this.send(msg);
};

//total number of retries = totalassignedseqId - totatassignedmsgId

Messenger.prototype.send = function(msg) {
	try {
		msg.seqId(this.getNextSeqId());
		logger.trace('Msg' + msg._msgId + ' sending to transport');
		return this._transport.send(msg);
	} catch(err) {
		logger.error('Msg' + msg._msgId + ' package manger failed to send msg- ' + err);
		self.callResponseCB(new Buffer(0), err);
		//handle via respCB
	}
};

Messenger.prototype.inProgress = function(msgId) {
	var self = this;
	var msg = self._queue.find(function(element) { return (element._msgId === msgId); });
	var index = this._queue.indexOf(msg);
	if(index) {
		this._queue[index].waitingForResponse(true);
	}
};

//Callback for frame sent to ZW from host
Messenger.prototype.requestFrameCB = function(msgId, err) {
	var self = this;

	var msg = false;
	for(var i = 0; i < self._queue.length; i++) {
		if(self._queue[i]._msgId == msgId) {
			msg = self._queue[i];
			break;
		}
	}

	if(!!msg) {
		if(err) {
			self.retry(msg, err);
		} else {
			//Resolve the request and wait for the response
			msg._promise.resolve();
			if(msg._respRequired) {
				//start response timeout timer;
				msg._respTimer = setTimeout(function() {
					//Timer expired
					self.callResponseCB(msg, new Error('Response timed out after '+ msg._respTimeout + 'ms'));
				}, msg._respTimeout);
			} else {
				self.removeMsg(msg);
			}
		}
	} else {
		logger.error('Could not find the message with msgId- '+ msgId);
	}
};

Messenger.prototype.retry = function(msg, err) {
	if(msg._retries-- > 0) {
		logger.info('Msg' + msg._msgId + ' retrying, left ' + msg._retries);
		this.send(msg);
	} else {
		msg._promise.reject(err);
		if(msg._respRequired)
			this.callResponseCB(msg, new Error('Retries failed'));
	}
};

Messenger.prototype.removeMsg = function(msg) {
	this._queue.splice(this._queue.indexOf(msg), 1); //splice removes the element and shortnes the array length, delete only removes the elements.
	logger.debug('Msg' + msg._msgId + ' dequeuing message, left in the queue ' + this._queue.length);
	return;
};

Messenger.prototype.callResponseCB = function(msg, err) {
	//check if the callback is assigned and remove it from the queue
	if(!err) {
		msg._promise.resolve();
	} else {
		logger.trace('Msg' + msg._msgId + ' calling response callback');
	}
	if(msg._respTimer) clearTimeout(msg._respTimer);
	if(msg._respCB && typeof msg._respCB === 'function') msg._respCB(err, msg);
	this.removeMsg(msg);
};

//FIFO so we look for the first msg which matches the command
Messenger.prototype.handleResponse = function(msg, frame) {
	if(!(frame instanceof DataFrame)) {
        throw new TypeError('incoming response should be of DataFrame type');
	}

	// var msg = false;
	// for(var i = 0; i < this._queue.length; i++) {
	// 	var element = this._queue[i];
	// 	logger.debug('Element slave address- '+ element._request.slaveAddress() + ' msgId- ' + element._msgId);
	// 	//Filter message based on slave address and function code
	// 	if(element._request.slaveAddress() == frame._slaveAddr &&
	// 		( (element._request.functionCode() == frame._funcCode) || (element._request.functionCode() == 0x80 | frame._funcCode) ) ) {
	// 		msg = element;
	// 		logger.trace('returing msgId- ' + msg._msgId);
	// 		break;
	// 	}
	// }

	if(!!msg) {
		logger.info('Msg' + msg._msgId + ' got response ' + frame.getOriginalBuffer().toString('hex'));
		if(frame._length == 5 && frame._funcCode == (0x80 | msg.respCode())) {
			return this.callResponseCB(msg, new Error('Modbus Bad Response ' + frame.getException()));
		}
		//Do sanity check of the response
		if(msg.respLength() !== 0 && frame._length != msg.respLength()) {
			return this.callResponseCB(msg, new Error('Data length error, expected ' + msg.respLength() + ' got ' + frame._length));
		}
		if(msg._respRequired) {
			msg.response(frame);
			this.callResponseCB(msg, null);
		}
	} else {
		logger.warn('Received frame for unknown request, not possible on Modbus');
		this.emit('modbusAsynEvent', frame);
	}
};

Messenger.prototype.assignEventListener = function(f) {
	if(typeof f !== 'function')
		throw new TypeError('Event listener should be of fucntion type');

	this.eventListener = f;
};

//Utils for testing
Messenger.prototype.flush = function() {
	this._queue.splice(1, this._queue.length);
	this._transport.flush();
	return;
};

Messenger.prototype.getQueue = function() {
	return this._queue;
};

Messenger.prototype.getQueueLength = function() {
	return {transport: this._transport.queueLength(), messenger: this._queue.length};
};

Messenger.prototype.getCurrentSeqId = function() {
	return this._seqId;
};

Messenger.prototype.getCurrentMsgId = function() {
	return this._msgId;
};

module.exports = Messenger;