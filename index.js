var Logger = require('./utils/logger');
var configurator = require('devjs-configurator');

var FunctionCode = require('./src/l4-functionCode');
var ModbusRTU = require('./src/modbusRTU');

var logger = new Logger( {moduleName: 'Driver', color: 'bgBlue'} );

//---------------------------------------------------------------------
configurator.configure("ModbusRTU",__dirname).then(function(data) {
	var options = data;

	logger.info('Starting with options ' + JSON.stringify(options));

	function startModbus() {
		var functionCode = new FunctionCode();
		functionCode.start(options).then(function() {

			try {
				var modbus = new ModbusRTU(options.modbusResourceId || "ModbusRTU1");
			} catch(e) {
				logger.error(e);
			}
			modbus.start(functionCode).then(function() {
				logger.info('Modbus RTU controller started successfully with ID ' + options.modbusResourceId);
			}, function(err) {
				logger.error('Could not start modbus controller ' + JSON.stringify(err));
				if(err.status == 500) {
					logger.error('Check the modbusResourceId in config.json, we already have one controller running with the specified id. Change the id and try again!');
				}
			})
		})
	}

	startModbus();
}, function(err) {
    logger.error('Unable to load ModbusRTU config.json, ' + err);
    return;
});