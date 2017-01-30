var DEFINES = {
	FUNCTION_CODE_ID: {},
	FUNCTION_CODE: {},
	EXCEPTION_CODE: {}
};

DEFINES.FUNCTION_CODE_ID = {
	01: 'Read Coil Status- This command is requesting the ON/OFF status of discrete coils',
	02: 'Read Input Status- This command is requesting the ON/OFF status of discrete inputs',
	03: 'Read Holding Registers- This command is requesting the content of analog output holding registers',
	04: 'Read Input Registers- This command is requesting the content of analog input register',
	05: 'Force Single Coil- This command is writing the contents of discrete coil',
	06: 'Preset Single Register- This command is writing the contents of analog output holding register',
	15: 'Force Multiple Coils- This command is writing the contents of a series of multiple discrete coils',
	16: 'Preset Multiple Registers- This command is writing the contents of multiple analog output holding registers'
};

DEFINES.FUNCTION_CODE = {};
DEFINES.FUNCTION_CODE.READ_COIL_STATUS 				= 0x01;//1
DEFINES.FUNCTION_CODE.READ_INPUT_STATUS 			= 0x02;//2
DEFINES.FUNCTION_CODE.READ_HOLDING_REGISTERS 		= 0x03;//3
DEFINES.FUNCTION_CODE.READ_INPUT_REGISTERS 			= 0x04;//4
DEFINES.FUNCTION_CODE.FORCE_SINGLE_COIL 			= 0x05;//5
DEFINES.FUNCTION_CODE.PRESET_SINGLE_REGISTER 		= 0x06;//6
DEFINES.FUNCTION_CODE.FORCE_MULTIPLE_COILS 			= 0x0F;//15
DEFINES.FUNCTION_CODE.PRESET_MULTIPLE_REGISTERS 	= 0x10;//16

DEFINES.EXCEPTION_CODE = {
	01: 'ILLEGAL FUNCTION- The function code received in the query is not an allowable action for the slave.  This may be because the function code is only applicable to newer devices, and was not implemented in the unit selected.  It could also indicate that the slave is in the wrong state to process a request of this type, for example because it is unconfigured and is being asked to return register values. If a Poll Program Complete command was issued, this code indicates that no program function preceded it.',
	02: 'ILLEGAL DATA ADDRESS- The data address received in the query is not an allowable address for the slave. More specifically, the combination of reference number and transfer length is invalid. For a controller with 100 registers, a request with offset 96 and length 4 would succeed, a request with offset 96 and length 5 will generate exception 02.',
	03: 'ILLEGAL DATA VALUE- A value contained in the query data field is not an allowable value for the slave.  This indicates a fault in the structure of remainder of a complex request, such as that the implied length is incorrect. It specifically does NOT mean that a data item submitted for storage in a register has a value outside the expectation of the application program, since the MODBUS protocol is unaware of the significance of any particular value of any particular register.',
	04: 'SLAVE DEVICE FAILURE- An unrecoverable error occurred while the slave was attempting to perform the requested action.',
	05: 'ACKNOWLEDGE- Specialized use in conjunction with programming commands. The slave has accepted the request and is processing it, but a long duration of time will be required to do so.  This response is returned to prevent a timeout error from occurring in the master. The master can next issue a Poll Program Complete message to determine if processing is completed.',
	06: 'SLAVE DEVICE BUSY- Specialized use in conjunction with programming commands. The slave is engaged in processing a long-duration program command.  The master should retransmit the message later when the slave is free..',
	07: 'NEGATIVE ACKNOWLEDGE- The slave cannot perform the program function received in the query. This code is returned for an unsuccessful programming request using function code 13 or 14 decimal. The master should request diagnostic or error information from the slave.',
	08: 'MEMORY PARITY ERROR- Specialized use in conjunction with function codes 20 and 21 and reference type 6, to indicate that the extended file area failed to pass a consistency check.  The slave attempted to read extended memory or record file, but detected a parity error in memory. The master can retry the request, but service may be required on the slave device.',
	10: 'GATEWAY PATH UNAVAILABLE- Specialized use in conjunction with gateways, indicates that the gateway was unable to allocate an internal communication path from the input port to the output port for processing the request. Usually means the gateway is misconfigured or overloaded.',
	11: 'GATEWAY TARGET DEVICE FAILED TO RESPOND- Specialized use in conjunction with gateways, indicates that no response was obtained from the target device. Usually means that the device is not present on the network.'
};


module.exports = {
	DEFINES: DEFINES
};