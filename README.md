# ModbusRTU
DeviceJS driver/module for Modbus RTU devices

# About Modbus
Modbus is a serial communication protocol developed by Modicon published by Modicon® in 1979 for use with its programmable logic controllers (PLCs). In simple terms, it is a method used for transmitting information over serial lines between electronic devices. The device requesting the information is called the Modbus Master and the devices supplying information are Modbus Slaves. In a standard Modbus network, there is one Master and up to 247 Slaves, each with a unique Slave Address from 1 to 247. The Master can also write information to the Slaves.

# Prerequisite
Should have installed and running DeviceJS (comes with database, DeviceDB)

# Install
```
cp devicejs.json package.json
```
```
npm install
```

# Run
``` 
devicejs run ModbusRTU
```
Note: Might have to be super user to access terminals

# Start Device Controllers
Initialized device meta data and start controller in 2 simple steps:

1. Create a JSON object with these properties
```
{
	"name": "imod6Switch1", //Make sure to change this for each resource so that their is no ambiguity. ResourceID is generated using this, if not specified.
	"resourceID": "", //Filename, Specify a unique ID used to register this resource with deviceJS, usage- dev$.selectByID(resourceID);
						// If not specified, will be generated by controller using name, slave address, interfaces, genre
	"deviceGenre": "switch", //thermometer, switch, lightDetector, register, coil
	"resourceType": "Core/Devices/ModbusRTU", //+ resourceID, Note- a resource type should have same interfaces 
	"version": "0.0.1",
	"slaveAddress": 2, //Modbus slave address
	"enable": true, //If false will not be started
	"overwrite": true, //If true, it will overwrite the changes made to this device controller during runtime
	"generateControllerFiles": true, //If true will generate files on disk otherwise not
	"interfaces": {
		"Facades/Switchable": { //This should match the supported interfaces (described in core-interfaces)
			"dataAddress": 203, //Cannot be array of non consecutive addresses
			"range": 1, //If not specified, default- 1
			"pollingInterval": 1000, //Specify polling interval in ms, min 500ms
			"outgoingOperation": "{{value}} > 100 ? 'off' : 'on'", //If you want perform operation on output
			"eventThreshold": 10, //incase of an array, it will compare each element if any element is greater than this then an event is emitted
			"unit": "" //Default unitless
		}
	}
}
```

2a. Save the above object in a file and place it in the contorllers/resourceTypes directory. Example: switch1.json
```
dev$.selectByID('ModbusRTU').call('start', 'switch1.json')
```
Note: Make sure it is the same file system as on which you are running ModbusRTU module

2b. Save the object in a file and place it in any directory. Example: /home/foo/workspace/switch1.json, Specify absolute path
```
dev$.selectByID('ModbusRTU').call('start', '/home/foo/workspace/switch1.json')
```
Note: Make sure it is the same file system as on which you are running ModbusRTU module

2c. Open up devicejs shell and do the following
```
var fs = require('fs');
var jsonminify = require('jsonminify');
var dcMetaData = fs.readFileSync('/home/foo/workspace/switch1.json', 'utf8')
dev$.selectByID('ModbusRTU').call('start', JSON.parse(jsonminify(dcMetaData)));
```

2d. Login to cloud.wigwag.com and go to inspect element --> console and run
```
dev$.selectByID('ModbusRTU').call('start', {
	"name": "imod6Switch1", //Make sure to change this for each resource so that their is no ambiguity. ResourceID is generated using this, if not specified.
	"resourceID": "", //Filename, Specify a unique ID used to register this resource with deviceJS, usage- dev$.selectByID(resourceID);
						// If not specified, will be generated by controller using name, slave address, interfaces, genre
	"deviceGenre": "switch", //thermometer, switch, lightDetector, register, coil
	"resourceType": "Core/Devices/ModbusRTU", //+ resourceID, Note- a resource type should have same interfaces 
	"version": "0.0.1",
	"slaveAddress": 2, //Modbus slave address
	"enable": true, //If false will not be started
	"overwrite": true, //If true, it will overwrite the changes made to this device controller during runtime
	"generateControllerFiles": true, //If true will generate files on disk otherwise not
	"interfaces": {
		"Facades/Switchable": { //This should match the supported interfaces (described in core-interfaces)
			"dataAddress": 203, //Cannot be array of non consecutive addresses
			"range": 1, //If not specified, default- 1
			"pollingInterval": 1000, //Specify polling interval in ms, min 500ms
			"outgoingOperation": "{{value}} > 100 ? 'off' : 'on'", //If you want perform operation on output
			"eventThreshold": 10, //incase of an array, it will compare each element if any element is greater than this then an event is emitted
			"unit": "" //Default unitless
		}
	}
});
```
