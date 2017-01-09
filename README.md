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
