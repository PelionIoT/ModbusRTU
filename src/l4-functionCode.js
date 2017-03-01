var Logger = require('./../utils/logger');
var DEFINES = require('./../lib/defs').DEFINES;
var logger = new Logger( {moduleName: 'FunctionCode', color: 'green'} );
var Transport = require('./l2-transport');
var Message = require('./../utils/message');
var handleBars = require('handlebars');

//The second byte sent by the Master is the Function code. This number tells the slave which table to access and whether to read from or write to the table.
var FunctionCode = function() {
	this._transport = null;
};

// FunctionCode.prototype = Object.create(EventEmitter.prototype);

FunctionCode.prototype.start = function(opts) {
	var self = this;

	return new Promise(function(resolve, reject) {
		self._transport = new Transport(opts);
		self._transport.start().then(function() {
			logger.info('Started successfully');
			resolve();
		}, function(err) {
			if(typeof opts.simulate !== 'undefined' && opts.simulate) {
				logger.warn('Continuing... As the SIMULATOR Mode is on');
				return resolve();
			}
			logger.error('Failed with error '+ err);
			// reject(err);
			resolve();
		});
	});
};

FunctionCode.prototype.call = function(fc, a, d, l, o) {
	var self = this;
	switch(fc) {
		case 0x01:
			return self.readCoils(a, d, l, o);
		break;

		case 0x02:
			return self.readDiscreteInputs(a, d, l, o);
		break;

		case 0x03:
			return self.readHoldingRegisters(a, d, l, o);
		break;

		case 0x04:
			return self.readDiscreteInputs(a, d, l, o);
		break;

		case 0x05:
			return self.writeCoil(a, d, l);
		break;

		case 0x06:
			return self.writeRegister(a, d, l);
		break;

		case 0x0F:
			return self.writeCoils(a, d, l);
		break;

		case 0x10:
			return self.writeRegisters(a, d, l);
		break;

		default:
			logger.error('Unknown function code called. This should not have happened.');
			return Promise.reject(new Error('Unknow function code called. This should not have happened!. Please assign function code from ' + Object.keys(DEFINES.FUNCTION_CODE_ID)))
		break;
	}
};

//(01) Read Coils
FunctionCode.prototype.readCoils = function (address, dataAddress, length, origin) {
	var self = this;
	var promise = {};
	var msg;

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (01) Read Coils from data address 0x' + dataAddress.toString(16) + ' length ' + length + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.READ_COIL_STATUS);
		msg._request.dataAddress(dataAddress);
		msg._request.numCoils(length);

		msg.requestType(origin + 'readCoils' + address.toString() + dataAddress.toString() + length.toString());

		msg.respLength(3 + parseInt((length - 1) / 8 + 1) + 2);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.READ_COIL_STATUS);

		self._transport.send(msg);
		delete msg;
	});
};

//(02) Read Discrete Inputs
FunctionCode.prototype.readDiscreteInputs = function (address, dataAddress, length, origin) {
	var self = this;
	var promise = {};
	var msg;

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (02) Read Discrete Inputs from data address 0x' + dataAddress.toString(16) + ' length ' + length + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.READ_INPUT_STATUS);
		msg._request.dataAddress(dataAddress);
		msg._request.numCoils(length);

		msg.requestType(origin + 'readDiscreteInputs' + address.toString() + dataAddress.toString() + length.toString());

		msg.respLength(3 + parseInt((length - 1) / 8 + 1) + 2);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.READ_INPUT_STATUS);

		self._transport.send(msg);
		delete msg;
	});
};

//(03) Reading Holding Registers
FunctionCode.prototype.readHoldingRegisters = function (address, dataAddress, length, origin) {
	var self = this;
	var promise = {};
	var msg;

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (03) Reading Holding Registers from data address ' + dataAddress + ' length ' + length + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.READ_HOLDING_REGISTERS);
		msg._request.dataAddress(dataAddress);
		msg._request.numRegisters(length);
		msg.requestType(origin + 'readHoldingRegisters' + address.toString() + dataAddress.toString() + length.toString());

		msg.respLength(3 + 2 * length + 2);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.READ_HOLDING_REGISTERS);

		self._transport.send(msg);
		delete msg;
	});
};

//(04) Read Input Registers
FunctionCode.prototype.readInputRegisters = function (address, dataAddress, length, origin) {
	var self = this;
	var promise = {};
	var msg;

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (04) Read Input Registers from data address 0x' + dataAddress.toString(16) + ' length ' + length + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.READ_INPUT_REGISTERS);
		msg._request.dataAddress(dataAddress);
		msg._request.numRegisters(length);

		msg.requestType(origin + 'readInputRegisters' + address.toString() + dataAddress.toString() + length.toString());

		msg.respLength(3 + 2 * length + 2);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.READ_INPUT_REGISTERS);

		self._transport.send(msg);
		delete msg;
	});
};

//(05) Force Single Coil
FunctionCode.prototype.writeCoil = function (address, dataAddress, state) {
	var self = this;
	var promise = {};
	var msg;

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (05) Force Single Coil from data address 0x' + dataAddress.toString(16) + ' state ' + state + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.FORCE_SINGLE_COIL);
		msg._request.dataAddress(dataAddress);
		if(state) {
			msg._request.state(0xff00);
		} else {
			msg._request.state(0x0000);
		}

		msg.requestType('writeCoil' + address.toString() + dataAddress.toString() + state.toString());

		msg.respLength(8);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.FORCE_SINGLE_COIL);

		self._transport.send(msg);
		delete msg;
	});
};

//(06) Preset Single Register
FunctionCode.prototype.writeRegister = function (address, dataAddress, value) {
	var self = this;
	var promise = {};
	var msg;

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (06) Preset Single Register from data address 0x' + dataAddress.toString(16) + ' value ' + value + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.PRESET_SINGLE_REGISTER);
		msg._request.dataAddress(dataAddress);
		msg._request.value(value);

		msg.requestType('writeRegister' + address.toString() + dataAddress.toString() + value.toString());

		msg.respLength(8);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.PRESET_SINGLE_REGISTER);

		self._transport.send(msg);
		delete msg;
	});
};

//(15) Force Multiple Coils
FunctionCode.prototype.writeCoils = function (address, dataAddress, array) {
	var self = this;
	var promise = {};
	var msg;

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (15) Force Multiple Coils from data address 0x0x' + dataAddress.toString(16) + ' array ' + array + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.FORCE_MULTIPLE_COILS);
		msg._request.dataAddress(dataAddress);
		msg._request.coilData(array);

		msg.requestType('writeCoils' + address.toString() + dataAddress.toString() + array.toString());

		msg.respLength(8);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.FORCE_MULTIPLE_COILS);

		self._transport.send(msg);
		delete msg;
	});
};

//(16) Preset Multiple Registers
FunctionCode.prototype.writeRegisters = function (address, dataAddress, array) {
	var self = this;
	var promise = {};
	var msg;

	//REQ
	return new Promise(function(resolve, reject) {
		promise = {resolve: resolve, reject: reject};
		msg = new Message();
		msg.description('{{SlaveAddress- ' + address + ', (16) Preset Multiple Registers from data address 0x' + dataAddress.toString(16) + ' array ' + array + '}}');
		msg.promise(promise);
		msg._request.slaveAddress(address);
		msg._request.functionCode(DEFINES.FUNCTION_CODE.PRESET_MULTIPLE_REGISTERS);
		msg._request.dataAddress(dataAddress);
		msg._request.coilData(array);

		msg.requestType('writeRegisters' + address.toString() + dataAddress.toString() + array.toString());

		msg.respLength(8);
		msg.respAddress(address);
		msg.respCode(DEFINES.FUNCTION_CODE.PRESET_MULTIPLE_REGISTERS);

		self._transport.send(msg);
		delete msg;
	});
};

/**
 * Evaluate operation on input data
 *
 * @method evalOperation
 * @param {Number} inputData input data on which operation will be performed
 * @param {String} operation operation with handlebars
 * @return {Number} outputData return evaluated operation result upto 2 decimal places
 */
FunctionCode.prototype.evalOperation = function(inputData, operation) {
	if(typeof operation === 'undefined') {
		return inputData;
	}
	logger.trace('Got evalOperation on inputData- ' + inputData + ' operation ' + JSON.stringify(operation));
	var template = handleBars.compile(JSON.stringify(operation));
    var info = {};
    info.value = inputData;
    var outputData = eval(JSON.parse(template(info)));
    return (typeof outputData === 'number') ? outputData.toFixed(2)/1 : outputData;
}

FunctionCode.prototype.getTransportStatus = function() {
	return this._transport.getStatus();
};

FunctionCode.prototype.flushQueue = function() {
	return this._transport.flush();
};

module.exports = FunctionCode;