var Logger = require('./utils/logger');
var configurator = require('devjs-configurator');

var FunctionCode = require('./src/l4-functionCode');

var logger = new Logger( {moduleName: 'Module', color: 'white'} );


/**
 * Modbus Remote Terminal Unit (RTU)
 * Provides commands which helps start and stop device controller
 *
 * @class ModbusRTU
 * @constructor
 * @param {Object} fc Function Code class specifies the read/write modbus formats
 */
var ModbusRTU = function() {
	start: function(fc) {
		this._fc = fc;
		// this._numDevices = 0;
		// this._runningControllers = 0;
		// this._listDevices;
	},
	stop: function() {
	},
	state: {
	},
	commands: {
		/**
		 * Start device controller
		 *
		 * @method start
		 * @param {Object} device specify filename/path/JSON object where device data is initialized to start a controller
		 * @return {Promise} The success handler accepts no parameter. The failure
		 *  handler accepts a single error object.
		 */
		start: function(device) {

		},
		/**
		 * Stop device controller
		 *
		 * @method start
		 * @param {Object} device 
		 * @return {Promise} The success handler accepts no parameter. The failure
		 *  handler accepts a single error object.
		 */
		stop: function() {

		},
		listDevices: function() {

		},
		listResources: function() {

		},
		listRunningResources: function() {

		},
		listEnabledResources: function() {

		},
		listDormantResources: function() {

		},
		listDisabledResources: function() {

		},
		listResourceTypes: function() {

		},
		listResourceIds: function() {

		},
		help: function() {
			//List the functions supported
			return Object.keys(this.commands);
		}
	}
}

module.exports = dev$.resource('ModbusRTU', ModbusRTU);

//---------------------------------------------------------------------
configurator.configure("ModbusRTU",__dirname).then(function(data) {
	var options = data;

	logger.info('Starting with options ' + JSON.stringify(options));

	function startModbus() {
		var functionCode = new FunctionCode();
		functionCode.start(options).then(function() {

			// setInterval(function() {
			// 	functionCode.readHoldingRegisters(2, 200, 10, function(err, data) {
			// 		if(err) {
			// 			// logger.error('read holding register error ' + err)
			// 			return;
			// 		}
			// 		logger.info('Got data ' + JSON.stringify(data._response._data));
			// 	});
			// }, 2000)
			
		})
	}

	startModbus();
}, function(err) {
    logger.error('Unable to load ModbusRTU config.json, ' + err);
    return;
});