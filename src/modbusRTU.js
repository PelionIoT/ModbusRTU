/**
 * Modbus Remote Terminal Unit (RTU)
 * Provides commands which helps start and stop device controller
 *
 * @class ModbusRTU
 * @constructor
 * @param {Object} fc Function Code class specifies the read/write modbus formats
 */
var ModbusRTU = {
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
			return 'Hello'
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