// create an empty modbus client 
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();
 
// open connection to a serial port 
client.connectRTU("/dev/ttyUSB1", {baudrate: 19200});
client.setID(1);
 
// read the values of 10 registers starting at address 0 
// on device number 1. and log the values to the console. 
setInterval(function() {
    client.readHoldingRegisters(0, 1000, function(err, data) {
        console.log(data.data);
    });
}, 1000);