var DataFrame = require('./dataFrame');

var _default = {
	ackRequired: true,
	callback: null,
	promise: null,
	retries: 0,
	retryInterval: 100, //ms
	description: "Unknown Message",
	msgId: 0, //Incremented only when it is a new message
	seqId: 0, //Incremented when it is being transmitted
	respRequired: false,
	respCB: null,
    respAddress: 0,
    respCode: 0,
    respLength: 0,
	respTimeout: 4000, //default 4 second
    parsedResponse: null,
    requestType: 'Unknown request',
    waitingForResponse: false
};

//Message encapsulating outgoing dataFrame from Host to ZW chip
var Message = function(msg) {
	if(typeof msg == 'undefined') {
		msg = {};
	}
	this._ackRequired = msg.ackRequired || _default.ackRequired;
	this._reqCB = msg.callback || _default.callback;
	this._promise = msg.promise || _default.promise;
	this._retries = msg.retries || _default.retries;
	this._retryInterval = msg.retryInterval || _default.retryInterval;
	this._description = msg.description || _default.description;
    this._requestType = msg.requestType || _default.requestType;
	this._msgId = msg.msgId || _default.msgId;
	this._seqId = msg.seqId || _default.seqId;
	this._respRequired = msg.respRequired || _default.respRequired;
	this._respCB = msg.respCB || _default.respCB;
    this._respCode = msg.respCode || _default.respCode;
    this._respLength = msg.respLength || _default.respLength;
    this._respAddress = msg.respAddress || _default.respAddress;
	this._respTimeout = msg.respTimeout || _default.respTimeout;
    this._parsedResponse = msg.parsedResponse || _default.parsedResponse;
    this._waitingForResponse = msg.waitingForResponse || _default.waitingForResponse;

	this._response = new DataFrame();
	this._request = new DataFrame();
	if((typeof msg.dataFrame != 'undefined') && (!(msg.dataFrame instanceof DataFrame))) {
		this._request = msg.dataFrame;
	}
}

Message.prototype.ackRequired = function(ack) {
    if (arguments.length == 1) {
        this._ackRequired = !!ack;
        return this;
    }
    else {
        return this._ackRequired;
    }
}

Message.prototype.callback = function(cb) {
    if (arguments.length == 1) {
	    if(typeof cb !== 'function') {
	        cb = function() { };
	    }
        this._reqCB = cb;
        return this;
    }
    else {
        return this._reqCB;
    }
}

Message.prototype.retries = function(retries) {
    if (arguments.length == 1) {
        this._retries = retries;
        return this;
    }
    else {
        return this._retries;
    }
}

Message.prototype.retryInterval = function(interval) {
    if (arguments.length == 1) {
        this._retryInterval = interval;
        return this;
    }
    else {
        return this._retryInterval;
    }
}

Message.prototype.description = function(descp) {
    if (arguments.length == 1) {
    	if(typeof descp === 'string')
        	this._description = descp;
        return this;
    }
    else {
        return this._description;
    }
}

Message.prototype.requestType = function(rt) {
    if (arguments.length == 1) {
        if(typeof rt === 'string')
            this._requestType = rt;
        return this;
    }
    else {
        return this._requestType;
    }
}

Message.prototype.seqId = function(seqId) {
    if (arguments.length == 1) {
        this._seqId = seqId;
        return this;
    }
    else {
        return this._seqId;
    }
}

Message.prototype.msgId = function(msgId) {
    if (arguments.length == 1) {
        this._msgId = msgId;
        return this;
    }
    else {
        return this._msgId;
    }
}

Message.prototype.dataFrame = function(frame) {
    if (arguments.length == 1) {
		this._request = new DataFrame();
    	if(!(frame instanceof DataFrame)) {
    		this._request = frame;
    	}
        return this;
    }
    else {
        return this._request;
    }
}

Message.prototype.respCB = function(cb) {
    if (arguments.length == 1) {
	    if(typeof cb !== 'function') {
	        cb = function() { };
	    }
	    this._respRequired = true;
	    this._respCB = cb;
        return this;
    }
    else {
        return this._respCB;
    }
}

Message.prototype.respTimeout = function(t) {
    if (arguments.length == 1) {
    	this._respTimeout = t;
        return this;
    }
    else {
        return this._respTimeout;
    }
}

Message.prototype.respAddress = function(a) {
    if (arguments.length == 1) {
        this._respAddress = a;
        return this;
    }
    else {
        return this._respAddress;
    }
}

Message.prototype.respCode = function(c) {
    if (arguments.length == 1) {
        this._respCode = c;
        return this;
    }
    else {
        return this._respCode;
    }
}

Message.prototype.respLength = function(l) {
    if (arguments.length == 1) {
        this._respLength = l;
        return this;
    }
    else {
        return this._respLength;
    }
}

Message.prototype.promise = function(p) {
    if (arguments.length == 1) {
    	this._promise = p;
        return this;
    }
    else {
        return this._promise;
    }
}

Message.prototype.response = function(resp) {
    if (arguments.length == 1) {
    	this._response = resp;
        return this;
    }
    else {
        return this._response;
    }
}

Message.prototype.parsedResponse = function(resp) {
    if (arguments.length == 1) {
        this._parsedResponse = resp;
        return this;
    }
    else {
        return this._parsedResponse;
    }
}

Message.prototype.waitingForResponse = function(flag) {
    if (arguments.length == 1) {
        this._waitingForResponse = flag;
        return this;
    }
    else {
        return this._waitingForResponse;
    }
}

module.exports = Message;