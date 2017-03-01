var validate = require('jsonschema').validate;
//Based on application use one of the schemes to define the modbus device controller definition
//*******************************************************************************************//
//Format1: Interfaces- For applications where data addresses are discrete (no continous range of dataaddress to poll)
var INTERFACE_SCHEMA_FORMAT = {
    "type": "object",
    "patternProperties": {
        "^.+$": { 
            "type": "object",
            "properties": {
                "dataAddress": { "type": "number" },
                "range": { "type": "number" },
                "pollingInterval": { "type": "number" },
                "readFunctionCode": { "type": "number" },
                "writeFunctionCode": { "type": "number" },
                "outgoingOperation": { "type": "string" },
                "name": { "type": "string" },
                "description": { "type": "string" },
                "unit": { "type": "string" },
                "eventThreshold": { "type": "number" }
            }
            // ,"required": [ "dataAddress", "pollingInterval", "readFunctionCode" ]
        }
    },
    "additionalProperties": false
};

var RESOURCE_DEFINITION_SCHEMA_FORMAT1 = {
    "type": "object",
    "properties": { 
        "name": { "type": "string" },
        "resourceID": { "type": "string" },
        "deviceGenre": { "type": "string" },
        "resourceType": { "type": "string" },
        "version": { "type": "string" },
        "slaveAddress": { "type": "number" },
        "enable": { "type": "boolean" },
        "overwrite": { "type": "boolean" },
        "generateControllerFiles": { "type": "boolean" },
        "interfaces": INTERFACE_SCHEMA_FORMAT
    },
    "required": [ "name", "slaveAddress", "interfaces" ]
};

//*******************************************************************************************//
//Format2- Registers- For application where you have range of data addresses to poll and each index can be categorized into different interfaces/facades types
var REGISTER_INTERFACES_SCHEMA_FORMAT = {
    "type": "object",
    "patternProperties": {
        "^.+$": { 
            "type": "object",
            "properties": {
                "index": { "type": "number" },
                "outgoingOperation": { "type": "string" },
                "name": { "type": "string" },
                "description": { "type": "string" },
                "unit": { "type": "string" },
                "eventThreshold": { "type": "number" }
            },
            "required": [ "index" ]
        }
    },
    "additionalProperties": false
};

var REGISTER_SCHEMA_FORMAT = {
    "type": "object",
    "properties": {
        "dataAddress": { "type": "number" },
        "range": { "type": "number" },
        "pollingInterval": { "type": "number" },
        "readFunctionCode": { "type": "number" },
        "writeFunctionCode": { "type": "number" },
        "interfaces": REGISTER_INTERFACES_SCHEMA_FORMAT
    },
    "required": [ "dataAddress", "pollingInterval", "readFunctionCode", "interfaces" ]
};

var RESOURCE_DEFINITION_SCHEMA_FORMAT2 = {
    "type": "object",
    "properties": { 
        "name": { "type": "string" },
        "resourceID": { "type": "string" },
        "deviceGenre": { "type": "string" },
        "resourceType": { "type": "string" },
        "version": { "type": "string" },
        "slaveAddress": { "type": "number" },
        "enable": { "type": "boolean" },
        "overwrite": { "type": "boolean" },
        "generateControllerFiles": { "type": "boolean" },
        "registers": { "type": REGISTER_SCHEMA_FORMAT }
    },
    "required": [ "name", "slaveAddress", "registers" ]
};

//*******************************************************************************************//
//Format 3- Register Runs- For application where data addresses are discrete or continous and multiple data points implement similar facades/interfaces.
var REGISTER_RUN_INDEXES_SCHEMA_FORMAT = {
    "type": "object",
    "patternProperties": {
        "^[0-9]*$": { 
            "type": "object",
            "properties": {
                "interface": { "type": "string" },
                "outgoingOperation": { "type": "string" },
                "name": { "type": "string" },
                "description": { "type": "string" },
                "unit": { "type": "string" },
                "eventThreshold": { "type": "number" }
            },
            "required": [ "interface" ]
        }
    },
    "additionalProperties": false
};

var REGISTER_RUN_SCHEMA_FORMAT = {
    "type": "object",
    "properties": {
        "dataAddress": { "type": "number" },
        "range": { "type": "number" },
        "pollingInterval": { "type": "number" },
        "readFunctionCode": { "type": "number" },
        "writeFunctionCode": { "type": "number" },
        "indexes": REGISTER_RUN_INDEXES_SCHEMA_FORMAT
    },
    "required": [ "dataAddress", "pollingInterval", "readFunctionCode", "indexes" ]
};

var RESOURCE_DEFINITION_SCHEMA_FORMAT3 = {
    "type": "object",
    "properties": { 
        "name": { "type": "string" },
        "resourceIdPosfix": { "type": "string" },
        "deviceGenre": { "type": "string" },
        "resourceType": { "type": "string" },
        "version": { "type": "string" },
        "slaveAddress": { "type": "number" },
        "enable": { "type": "boolean" },
        "overwrite": { "type": "boolean" },
        "generateControllerFiles": { "type": "boolean" },
        "registerRuns": {
            "type": "array",
            "items": {
                "type": REGISTER_RUN_SCHEMA_FORMAT
            }
        }
    },
    "required": [ "name", "slaveAddress", "registerRuns" ]
};
//*******************************************************************************************//

module.exports = {
    isValidDefinition: function(metadata) {
        var err = {};
        if(validate(metadata, RESOURCE_DEFINITION_SCHEMA_FORMAT1).valid) {
            return {valid: true, format: 1};
        } else {
            err.Format1 = validate(metadata, RESOURCE_DEFINITION_SCHEMA_FORMAT1).errors[0].message;
        }

        if(validate(metadata, RESOURCE_DEFINITION_SCHEMA_FORMAT2).valid) {
            return {valid: true, format: 2};
        } else {
            err.Format2 = validate(metadata, RESOURCE_DEFINITION_SCHEMA_FORMAT2).errors[0].message;
        }

        if(validate(metadata, RESOURCE_DEFINITION_SCHEMA_FORMAT3).valid) {
            return {valid: true, format: 3};
        } else {
            err.Format3 = validate(metadata, RESOURCE_DEFINITION_SCHEMA_FORMAT3).errors[0].message;
        }

        return {valid: false, error: err};
    }
};