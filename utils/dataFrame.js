var DEFINES = require('./../lib/defs').DEFINES;
var frameLayout = require('./frameLayout');
var crc16 = require('./crc16');

//Construct or parse DATA frame (ModbusRTU Request)
var DataFrame = function(buffer) {
	if(buffer) {
		this._originalBuffer = buffer;
		this._length = buffer.length;
		this._validLength = validateLength(this);

		//Based on Function Code parse the incoming buffer
		if(this._validLength) {
			this._slaveAddr = frameLayout.GET_SADDR(buffer);
			this._funcCode = frameLayout.GET_FC(buffer);
			this._funcCodeDescription = DEFINES.FUNCTION_CODE_ID[this._funcCode];
			this._checksum = frameLayout.GET_CHECKSUM(buffer);

			this._validChecksum = validateChecksum(this);

			if(this._validChecksum) {
				parse(this, this._funcCode, buffer);
			}
		}

	} else {
		this._slaveAddr = 0x01;
		this._length = 0x00;
		this._funcCode = 0x01;
		this._dataBytes = 0;
	}
	return true;
}

var parse = function(self, fc, data) {

	switch(fc) {
		/**
		 * Parse the data for a Modbus -
		 * Read Coils (FC=02, 01)
		 *
		 * @param {Buffer} data the data buffer to parse.
		 * @param {Function} next the function to call next.
		 */
		case DEFINES.FUNCTION_CODE.READ_COIL_STATUS:
		case DEFINES.FUNCTION_CODE.READ_INPUT_STATUS:
			self._dataLen = frameLayout.GET_DATALEN(data);
			self._data = frameLayout.GET_COIL(data, self._dataLen);
		break;

		/**
		 * Parse the data for a Modbus -
		 * Read Input Registers (FC=04, 03)
		 *
		 * @param {Buffer} data the data buffer to parse.
		 * @param {Function} next the function to call next.
		 */
		case DEFINES.FUNCTION_CODE.READ_INPUT_REGISTERS:
		case DEFINES.FUNCTION_CODE.READ_HOLDING_REGISTERS:
			self._dataLen = frameLayout.GET_DATALEN(data);
			self._data = frameLayout.GET_REGISTER(data, self._dataLen);
		break;

		/**
		 * Parse the data for a Modbus -
		 * Force Single Coil (FC=05)
		 *
		 * @param {Buffer} data the data buffer to parse.
		 * @param {Function} next the function to call next.
		 */
		case DEFINES.FUNCTION_CODE.FORCE_SINGLE_COIL:
			self._dataAddr = frameLayout.GET_DATA_ADDR(data);
			self._state = frameLayout.GET_STATE(data);
			self._stateStatus = (self._state == 0xFF00) ? 'ON' : 'OFF';
		break;

		/**
		 * Parse the data for a Modbus -
		 * Preset Single Registers (FC=06)
		 *
		 * @param {Buffer} data the data buffer to parse.
		 * @param {Function} next the function to call next.
		 */
		case DEFINES.FUNCTION_CODE.PRESET_SINGLE_REGISTER:
			self._dataAddr = frameLayout.GET_DATA_ADDR(data);
			self._value = frameLayout.GET_VALUE(data);
		break;

		/**
		 * Parse the data for a Modbus -
		 * Preset Multiple Registers (FC=15, 16)
		 *
		 * @param {Buffer} data the data buffer to parse.
		 * @param {Function} next the function to call next.
		 */
		case DEFINES.FUNCTION_CODE.FORCE_MULTIPLE_COILS:
		case DEFINES.FUNCTION_CODE.PRESET_MULTIPLE_REGISTERS:
			self._dataAddr = frameLayout.GET_DATA_ADDR(data);
			self._numRegs = frameLayout.GET_NUM_REGISTERS(data);
		break;


		case 0x80 | DEFINES.FUNCTION_CODE.READ_COIL_STATUS:
		case 0x80 | DEFINES.FUNCTION_CODE.READ_INPUT_STATUS:
		case 0x80 | DEFINES.FUNCTION_CODE.READ_INPUT_REGISTERS:
		case 0x80 | DEFINES.FUNCTION_CODE.READ_HOLDING_REGISTERS:
		case 0x80 | DEFINES.FUNCTION_CODE.FORCE_SINGLE_COIL:
		case 0x80 | DEFINES.FUNCTION_CODE.PRESET_SINGLE_REGISTER:
		case 0x80 | DEFINES.FUNCTION_CODE.FORCE_MULTIPLE_COILS:
		case 0x80 | DEFINES.FUNCTION_CODE.PRESET_MULTIPLE_REGISTERS:
			self._exception = frameLayout.GET_EXCEPTION_BYTE(data);
			self._exceptionDescription = DEFINES.EXCEPTION_CODE[self._exception];
		break;

		default:
		break;
	}
}


DataFrame.prototype.slaveAddress = function(saddr) {
    if (arguments.length == 1) {
        this._slaveAddr = saddr;
        return this;
    }
    else {
        return this._slaveAddr;
    }
}

DataFrame.prototype.functionCode = function(fc) {
    if (arguments.length == 1) {
        this._funcCode = fc;
        return this;
    }
    else {
        return this._funcCode;
    }
}

DataFrame.prototype.dataAddress = function(dataAddr) {
    if (arguments.length == 1) {
        this._dataAddr = dataAddr;
        return this;
    }
    else {
        return this._dataAddr;
    }
}

DataFrame.prototype.numCoils = function(num) {
    if (arguments.length == 1) {
        this._numCoils = num;
        return this;
    }
    else {
        return this._numCoils;
    }
}

DataFrame.prototype.numRegisters = function(num) {
    if (arguments.length == 1) {
        this._numRegs = num;
        return this;
    }
    else {
        return this._numRegs;
    }
}

DataFrame.prototype.state = function(state) {
    if (arguments.length == 1) {
        this._state = state;
        return this;
    }
    else {
        return this._state;
    }
}

DataFrame.prototype.value = function(value) {
    if (arguments.length == 1) {
        this._value = value;
        return this;
    }
    else {
        return this._value;
    }
}

DataFrame.prototype.dataBytes = function(bytes) {
    if (arguments.length == 1) {
        this._dataBytes = bytes + 1; //+1 for databytes
        return this;
    }
    else {
        return this._dataBytes;
    }
}

DataFrame.prototype.coilData = function(data) {
    if (arguments.length == 1) {
    	if(typeof data !== 'object') {
    		throw new TypeError('Coil data should be of array type');
    		return;
    	}
        this._coilData = data;
        this.numCoils(data.length);
        this.dataBytes(Math.ceil(this._coilData.length / 8));
        return this;
    }
    else {
        return this._coilData;
    }
}

DataFrame.prototype.registerData = function(data) {
    if (arguments.length == 1) {
    	if(typeof data !== 'object') {
    		throw new TypeError('Coil data should be of array type');
    		return;
    	}
        this._registerData = data;
        this.numRegisters(data.length)
        this.dataBytes(this._registerData.length * 2);
        return this;
    }
    else {
        return this.registerData;
    }
}

DataFrame.prototype.getException = function() {
	this._exception = frameLayout.GET_EXCEPTION_BYTE(this._originalBuffer);
	this._exceptionDescription = DEFINES.EXCEPTION_CODE[this._exception];
	return this._exception + ' ' + this._exceptionDescription;
}

DataFrame.prototype.getOriginalBuffer = function() {
	return this._originalBuffer;
}

DataFrame.prototype.isValidLength = function(is) {
	if(arguments.length == 1) {
		this._validLength = !!is;
		return this;
	} else  {
		return this._validLength;
	}
}

DataFrame.prototype.isValidChecksum = function(is) {
	if(arguments.length == 1) {
		this._validChecksum = !!is;
		return this;
	} else  {
		return this._validChecksum;
	}
}

/*
The Checksum field MUST carry a checksum to enable frame integrity checks.
The checksum calculation MUST include the Length, Type, Serial API Command Data and Serial API
Command Parameters fields.
The checksum value MUST be calculated as an 8-bit Longitudinal Redundancy Check (LRC) value.
The RECOMMENDED way to calculate the checksum is to initialize the checksum to 0xFF and then
XOR each of the bytes of the fields mentioned above one at a time to the checksum value.
Checksum = 0xFF  Length  Type  Cmd ID  Cmd Parm[1]  ...  Cmd Parm[n]
A Data frame MUST be considered invalid if it is received with an invalid checksum.
*/
function calculateChecksum(self) {
	return crc16(self._originalBuffer.slice(0, -2));
}

//The Length field MUST report the number of bytes in the Data frame. The value of the Length Field MUST NOT include the SOF and Checksum fields.
function calculateLength(self) {
	return (1 + 1 + 2 + 2); //addr + fc + dataaddr(2) + len(2) 
}

function validateChecksum(self) {
	return (self._checksum == calculateChecksum(self));
}

function validateLength(self) {
	return (self._length >= 5);
}

DataFrame.prototype.toBuffer = function() {
	this._length = calculateLength(this) + 2 + this._dataBytes; // +CRC
	var frame = new Buffer(this._length);
	frame.fill(0);

	switch(this._funcCode) {
		/**
		 * Write a Modbus "Read Coil Status" (FC=01) && "Read Input Status" (FC=02) to serial port.
		 *
		 * @param {number} address the slave unit address.
		 * @param {number} dataAddress the Data Address of the first coil.
		 * @param {number} length the total number of coils requested.
		 */
		case DEFINES.FUNCTION_CODE.READ_COIL_STATUS:
		case DEFINES.FUNCTION_CODE.READ_INPUT_STATUS:
			frameLayout.SET_SADDR(frame, this._slaveAddr);
			frameLayout.SET_FC(frame, this._funcCode);
			frameLayout.SET_DATA_ADDR(frame, this._dataAddr);
			frameLayout.SET_NUM_COILS(frame, this._numCoils);
		break;

		/**
		 * Write a Modbus "Read Holding Registers" (FC=03) && "Read Input Registers" (FC=04) to serial port.
		 *
		 * @param {number} address the slave unit address.
		 * @param {number} dataAddress the Data Address of the first register.
		 * @param {number} length the total number of registers requested.
		 * @param {Function} next the function to call next.
		 */

		case DEFINES.FUNCTION_CODE.READ_INPUT_REGISTERS:
		case DEFINES.FUNCTION_CODE.READ_HOLDING_REGISTERS:
			frameLayout.SET_SADDR(frame, this._slaveAddr);
			frameLayout.SET_FC(frame, this._funcCode);
			frameLayout.SET_DATA_ADDR(frame, this._dataAddr);
			frameLayout.SET_NUM_REGISTERS(frame, this._numRegs);
		break;

		/**
		 * Write a Modbus "Force Single Coil" (FC=05) to serial port.
		 *
		 * @param {number} address the slave unit address.
		 * @param {number} dataAddress the Data Address of the coil.
		 * @param {number} state the boolean state to write to the coil (true / false).
		 * @param {Function} next the function to call next.
		 */
		case DEFINES.FUNCTION_CODE.FORCE_SINGLE_COIL:
			frameLayout.SET_SADDR(frame, this._slaveAddr);
			frameLayout.SET_FC(frame, this._funcCode);
			frameLayout.SET_DATA_ADDR(frame, this._dataAddr);
			frameLayout.SET_STATE(frame, this._state);
		break;

		/**
		 * Write a Modbus "Preset Single Register " (FC=6) to serial port.
		 *
		 * @param {number} address the slave unit address.
		 * @param {number} dataAddress the Data Address of the register.
		 * @param {number} value the value to write to the register.
		 * @param {Function} next the function to call next.
		 */
		case DEFINES.FUNCTION_CODE.PRESET_SINGLE_REGISTER:
			frameLayout.SET_SADDR(frame, this._slaveAddr);
			frameLayout.SET_FC(frame, this._funcCode);
			frameLayout.SET_DATA_ADDR(frame, this._dataAddr);
			frameLayout.SET_VALUE(frame, this._value);
		break;

		/**
		 * Write a Modbus "Force Multiple Coils" (FC=15) to serial port.
		 *
		 * @param {number} address the slave unit address.
		 * @param {number} dataAddress the Data Address of the first coil.
		 * @param {Array} array the array of boolean states to write to coils.
		 * @param {Function} next the function to call next.
		 */
		case DEFINES.FUNCTION_CODE.FORCE_MULTIPLE_COILS:
			frameLayout.SET_SADDR(frame, this._slaveAddr);
			frameLayout.SET_FC(frame, this._funcCode);
			frameLayout.SET_DATA_ADDR(frame, this._dataAddr);
			frameLayout.SET_NUM_COILS(frame, this._numCoils);
			frameLayout.SET_DATA_BYTES(frame, this._dataBytes);
			frameLayout.SET_COIL(frame, this._coilData);
		break;

		/**
		 * Write a Modbus "Preset Multiple Registers" (FC=16) to serial port.
		 *
		 * @param {number} address the slave unit address.
		 * @param {number} dataAddress the Data Address of the first register.
		 * @param {Array} array the array of values to write to registers.
		 * @param {Function} next the function to call next.
		 */
		case DEFINES.FUNCTION_CODE.PRESET_MULTIPLE_REGISTERS:
			frameLayout.SET_SADDR(frame, this._slaveAddr);
			frameLayout.SET_FC(frame, this._funcCode);
			frameLayout.SET_DATA_ADDR(frame, this._dataAddr);
			frameLayout.SET_NUM_REGISTERS(frame, this._numRegs);
			frameLayout.SET_DATA_BYTES(frame, this._dataBytes);
			frameLayout.SET_REGISTER(frame, this._registerData);
		break;
	}

	this._originalBuffer = frame;

	this._checksum = calculateChecksum(this);
	frameLayout.SET_CHECKSUM(frame, this._checksum);

	return frame;
}

module.exports = DataFrame;