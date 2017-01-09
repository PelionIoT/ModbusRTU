// create an empty modbus client

// open a serial port 
var sp = require("serialport");
var SerialPort = sp.SerialPort;
var serialPort = new SerialPort("/dev/ttyUSB0", {baudrate: 19200, autoOpen: false}, false);
 
// create a modbus client using the serial port 
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU(serialPort);

// // open connection to a serial port 
// client.connectRTU("/dev/ttyUSB0", {baudrate: 9600}, write);
 
// function write() {
// 	console.log('Successfully opened the port');
//     client.setID(1);
 
//     // write the values 0, 0xffff to registers starting at address 5 
//     // on device number 1. 
//     client.writeRegisters(5, [0 , 0xffff])
//         .then(read);
// }
 
// function read() {
//     // read the 2 registers starting at address 5 
//     // on device number 1. 
//     console.log('Going to read')
//     client.writeFC3(1, 1, 2, function(resp) {
// 		console.log('Data- ', resp);
// 	})
// }

// var ModbusRTU = require("modbus-serial");
// var client = new ModbusRTU();
client.open(function(resp) {
	console.log('Port response- ', resp);
	client.setID(2);
	read()
})


// function write() {
//     client.setID(1);
 
//     // write the values 0, 0xffff to registers starting at address 5 
//     // on device number 1. 
//     client.writeRegisters(5, [0 , 0xffff])
//         .then(read);
// }
 
 //01 03 00 00 00 02 C4 0B
function read() {
    // read the 2 registers starting at address 5 
    // on device number 1. 
    client.readHoldingRegisters(0, 10)
        .then(console.log);
}
 