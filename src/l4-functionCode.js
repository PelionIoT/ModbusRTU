var Logger = require('./../utils/logger');
var DEFINES = require('./../lib/defs').DEFINES;
var logger = new Logger( {moduleName: 'FunctionCode', color: 'green'} );
var Manager = require('./l3-manager');
var Message = require('./../utils/message');

//The second byte sent by the Master is the Function code. This number tells the slave which table to access and whether to read from or write to the table.
var FunctionCode = function() {
	this._manager = null;
}

// FunctionCode.prototype = Object.create(EventEmitter.prototype);

FunctionCode.prototype.start = function(opts) {
	var self = this;

	return new Promise(function(resolve, reject) {
		self._manager = new Manager();
		self._manager.start(opts).then(function() {
			logger.info('Started successfully');
			resolve();
		}, function(err) {
			logger.error('Failed with error '+ err);
			reject(err);
		});
	});
}

//(01) Read Coils
FunctionCode.prototype.readCoils = function (address, dataAddress, length, cb) {
	var self = this;
	var promise = {};
	var msg;

	//Error handling
	if(typeof cb !== 'function') {
		throw new TypeError('readCoils: Passed invalid argument')
	}

	// //Helpers
	// function parser(cmdId, data) {
	// 	var response = {}
	// 	if(cmdId === DEFINES.SERIALAPI_CMD_ID.FUNC_ID_ZW_GET_RANDOM) {
	// 		response.isGenerated = !!data.slice(0, 1)[0];
	// 		response.numBytes = data.slice(1, 2)[0];
	// 		response.randomBytes = data.slice(2);
	// 	}
	// 	return response;
	// }

	//RES
	function responseCB(err, data) {
		if(err) {
			logger.error('readCoils got error ' + err);
		} else {
			// data.parsedResponse(parser(data._response._cmdId, data._response._cmdParams));
		}
		cb(err, data);
	}

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (01) Read Coils from data address ' + dataAddress.toString(16) + ' length ' + length + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.READ_COIL_STATUS);
		msg._request.dataAddress(dataAddress);
		msg._request.numCoils(length);

		msg.respLength(3 + parseInt((length - 1) / 8 + 1) + 2);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.READ_COIL_STATUS);
		
		self._manager.push(msg, responseCB);
		delete msg;
	});
};

//(02) Read Discrete Inputs
FunctionCode.prototype.readDiscreteInputs = function (address, dataAddress, length, cb) {
	var self = this;
	var promise = {};
	var msg;

	//Error handling
	if(typeof cb !== 'function') {
		throw new TypeError('readDiscreteInputs: Passed invalid argument')
	}

	// //Helpers
	// function parser(cmdId, data) {
	// 	var response = {}
	// 	if(cmdId === DEFINES.SERIALAPI_CMD_ID.FUNC_ID_ZW_GET_RANDOM) {
	// 		response.isGenerated = !!data.slice(0, 1)[0];
	// 		response.numBytes = data.slice(1, 2)[0];
	// 		response.randomBytes = data.slice(2);
	// 	}
	// 	return response;
	// }

	//RES
	function responseCB(err, data) {
		if(err) {
			logger.error('readDiscreteInputs got error ' + err);
		} else {
			// data.parsedResponse(parser(data._response._cmdId, data._response._cmdParams));
		}
		cb(err, data);
	}

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (02) Read Discrete Inputs from data address ' + dataAddress.toString(16) + ' length ' + length + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.READ_INPUT_STATUS);
		msg._request.dataAddress(dataAddress);
		msg._request.numCoils(length);

		msg.respLength(3 + parseInt((length - 1) / 8 + 1) + 2);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.READ_INPUT_STATUS);
		
		self._manager.push(msg, responseCB);
		delete msg;
	});
};

//(03) Reading Holding Registers
FunctionCode.prototype.readHoldingRegisters = function (address, dataAddress, length, cb) {
	var self = this;
	var promise = {};
	var msg;

	//Error handling
	if(typeof cb !== 'function') {
		throw new TypeError('readHoldingRegisters: Passed invalid argument')
	}

	// //Helpers
	// function parser(cmdId, data) {
	// 	var response = {}
	// 	if(cmdId === DEFINES.SERIALAPI_CMD_ID.FUNC_ID_ZW_GET_RANDOM) {
	// 		response.isGenerated = !!data.slice(0, 1)[0];
	// 		response.numBytes = data.slice(1, 2)[0];
	// 		response.randomBytes = data.slice(2);
	// 	}
	// 	return response;
	// }

	//RES
	function responseCB(err, data) {
		if(err) {
			logger.error('readHoldingRegisters got error ' + err);
		} else {
			// data.parsedResponse(parser(data._response._cmdId, data._response._cmdParams));
		}
		cb(err, data);
	}

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (03) Reading Holding Registers from data address ' + dataAddress.toString(16) + ' length ' + length + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.READ_HOLDING_REGISTERS);
		msg._request.dataAddress(dataAddress);
		msg._request.numRegisters(length);

		msg.respLength(3 + 2 * length + 2);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.READ_HOLDING_REGISTERS);
		
		self._manager.push(msg, responseCB);
		delete msg;
	});
};

//(04) Read Input Registers
FunctionCode.prototype.readInputRegisters = function (address, dataAddress, length, cb) {
	var self = this;
	var promise = {};
	var msg;

	//Error handling
	if(typeof cb !== 'function') {
		throw new TypeError('readInputRegisters: Passed invalid argument')
	}

	// //Helpers
	// function parser(cmdId, data) {
	// 	var response = {}
	// 	if(cmdId === DEFINES.SERIALAPI_CMD_ID.FUNC_ID_ZW_GET_RANDOM) {
	// 		response.isGenerated = !!data.slice(0, 1)[0];
	// 		response.numBytes = data.slice(1, 2)[0];
	// 		response.randomBytes = data.slice(2);
	// 	}
	// 	return response;
	// }

	//RES
	function responseCB(err, data) {
		if(err) {
			logger.error('readInputRegisters got error ' + err);
		} else {
			// data.parsedResponse(parser(data._response._cmdId, data._response._cmdParams));
		}
		cb(err, data);
	}

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (04) Read Input Registers from data address ' + dataAddress.toString(16) + ' length ' + length + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.READ_INPUT_REGISTERS);
		msg._request.dataAddress(dataAddress);
		msg._request.numRegisters(length);

		msg.respLength(3 + 2 * length + 2);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.READ_INPUT_REGISTERS);
		
		self._manager.push(msg, responseCB);
		delete msg;
	});
};

//(05) Force Single Coil
FunctionCode.prototype.writeCoil = function (address, dataAddress, state, cb) {
	var self = this;
	var promise = {};
	var msg;

	//Error handling
	if(typeof cb !== 'function' && typeof state !== 'boolean') {
		throw new TypeError('writeCoil: Passed invalid argument')
	}

	// //Helpers
	// function parser(cmdId, data) {
	// 	var response = {}
	// 	if(cmdId === DEFINES.SERIALAPI_CMD_ID.FUNC_ID_ZW_GET_RANDOM) {
	// 		response.isGenerated = !!data.slice(0, 1)[0];
	// 		response.numBytes = data.slice(1, 2)[0];
	// 		response.randomBytes = data.slice(2);
	// 	}
	// 	return response;
	// }

	//RES
	function responseCB(err, data) {
		if(err) {
			logger.error('writeCoil got error ' + err);
		} else {
			// data.parsedResponse(parser(data._response._cmdId, data._response._cmdParams));
		}
		cb(err, data);
	}

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (05) Force Single Coil from data address ' + dataAddress.toString(16) + ' state ' + state + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.FORCE_SINGLE_COIL);
		msg._request.dataAddress(dataAddress);
		if(state) {
			msg._request.state(0xff00);
		} else {
			msg._request.state(0x0000)
		}

		msg.respLength(8);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.FORCE_SINGLE_COIL);
		
		self._manager.push(msg, responseCB);
		delete msg;
	});
};

//(06) Preset Single Register
FunctionCode.prototype.writeRegister = function (address, dataAddress, value, cb) {
	var self = this;
	var promise = {};
	var msg;

	//Error handling
	if(typeof cb !== 'function') {
		throw new TypeError('writeRegister: Passed invalid argument')
	}

	// //Helpers
	// function parser(cmdId, data) {
	// 	var response = {}
	// 	if(cmdId === DEFINES.SERIALAPI_CMD_ID.FUNC_ID_ZW_GET_RANDOM) {
	// 		response.isGenerated = !!data.slice(0, 1)[0];
	// 		response.numBytes = data.slice(1, 2)[0];
	// 		response.randomBytes = data.slice(2);
	// 	}
	// 	return response;
	// }

	//RES
	function responseCB(err, data) {
		if(err) {
			logger.error('writeRegister got error ' + err);
		} else {
			// data.parsedResponse(parser(data._response._cmdId, data._response._cmdParams));
		}
		cb(err, data);
	}

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (06) Preset Single Register from data address ' + dataAddress.toString(16) + ' value ' + value + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.PRESET_SINGLE_REGISTER);
		msg._request.dataAddress(dataAddress);
		msg._request.value(value);

		msg.respLength(8);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.PRESET_SINGLE_REGISTER);
		
		self._manager.push(msg, responseCB);
		delete msg;
	});
};

//(15) Force Multiple Coils
FunctionCode.prototype.writeCoils = function (address, dataAddress, array, cb) {
	var self = this;
	var promise = {};
	var msg;

	//Error handling
	if(typeof cb !== 'function' && typeof array	!== 'object') {
		throw new TypeError('writeCoils: Passed invalid argument')
	}

	// //Helpers
	// function parser(cmdId, data) {
	// 	var response = {}
	// 	if(cmdId === DEFINES.SERIALAPI_CMD_ID.FUNC_ID_ZW_GET_RANDOM) {
	// 		response.isGenerated = !!data.slice(0, 1)[0];
	// 		response.numBytes = data.slice(1, 2)[0];
	// 		response.randomBytes = data.slice(2);
	// 	}
	// 	return response;
	// }

	//RES
	function responseCB(err, data) {
		if(err) {
			logger.error('writeCoils got error ' + err);
		} else {
			// data.parsedResponse(parser(data._response._cmdId, data._response._cmdParams));
		}
		cb(err, data);
	}

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (15) Force Multiple Coils from data address ' + dataAddress.toString(16) + ' array ' + array + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.FORCE_MULTIPLE_COILS);
		msg._request.dataAddress(dataAddress);
		msg._request.coilData(array);

		msg.respLength(8);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.FORCE_MULTIPLE_COILS);
		
		self._manager.push(msg, responseCB);
		delete msg;
	});
};

//(16) Preset Multiple Registers
FunctionCode.prototype.writeRegisters = function (address, dataAddress, array, cb) {
	var self = this;
	var promise = {};
	var msg;

	//Error handling
	if(typeof cb !== 'function' && typeof array	!== 'object') {
		throw new TypeError('writeRegisters: Passed invalid argument')
	}

	// //Helpers
	// function parser(cmdId, data) {
	// 	var response = {}
	// 	if(cmdId === DEFINES.SERIALAPI_CMD_ID.FUNC_ID_ZW_GET_RANDOM) {
	// 		response.isGenerated = !!data.slice(0, 1)[0];
	// 		response.numBytes = data.slice(1, 2)[0];
	// 		response.randomBytes = data.slice(2);
	// 	}
	// 	return response;
	// }

	//RES
	function responseCB(err, data) {
		if(err) {
			logger.error('writeRegisters got error ' + err);
		} else {
			// data.parsedResponse(parser(data._response._cmdId, data._response._cmdParams));
		}
		cb(err, data);
	}

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (16) Preset Multiple Registers from data address ' + dataAddress.toString(16) + ' array ' + array + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.PRESET_MULTIPLE_REGISTERS);
		msg._request.dataAddress(dataAddress);
		msg._request.coilData(array);

		msg.respLength(8);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.PRESET_MULTIPLE_REGISTERS);
		
		self._manager.push(msg, responseCB);
		delete msg;
	});
};

module.exports = FunctionCode;