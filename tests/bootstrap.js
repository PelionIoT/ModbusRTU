var Logger = require('./../utils/logger');
var configurator = require('devjs-configurator');
// var DEFINES = require('./lib/defs').DEFINES;

var FunctionCode = require('./../src/l4-functionCode');

var logger = new Logger( {moduleName: 'Test-Bootstrap', color: 'green'} );

var functionCode;

//---------------------------------------------------------------------
configurator.configure("ModbusRTU",__dirname).then(function(data) {
	var options = data;

	logger.info('Starting with options ' + JSON.stringify(options));

	function startModbus() {
		functionCode = new FunctionCode();
		functionCode.start(options).then(function() {

			setInterval(function() {
				functionCode.readHoldingRegisters(2, 200, 10, function(err, data) {
					if(err) {
						// logger.error('read holding register error ' + err)
						return;
					}
					logger.info('Got data ' + JSON.stringify(data._response._data));
				});
			}, 2000)

			// functionCode.readCoils(2, 0, 10, function(err, data) {
			// 	if(err) {
			// 		// logger.error('read coils error ' + err)
			// 		return;
			// 	}
			// 	logger.info('Got data ' + JSON.stringify(data._response._data));
			// });
			
		})
	}

	startModbus();
}, function(err) {
    logger.error('Unable to load ModbusRTU config.json, ' + err);
    return;
});