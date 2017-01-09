var fs = require('fs');
var jsonminify = require('jsonminify');
var Logger = require('./../utils/logger');
var logger = new Logger( {moduleName: 'Manager', color: 'bgBlue'} );
/**
 * Modbus Remote Terminal Unit (RTU)
 * Provides commands which helps start and stop device controller
 *
 * @class ModbusRTU
 * @constructor
 * @param {Object} fc Function Code class specifies the read/write modbus formats
 */
var ModbusRTU = {
	start: function(obj) {
		logger.info('Starting controller');
		this._fc = obj.fc;
		this._resourceDirectory = obj.resourceTypesDirectory;
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
			logger.info('Got start on device ' + JSON.stringify(device));
			function checkAndReadFile(file) {
				return new Promise(function(resolve, reject) {
					if(!fs.existsSync(file)) {
						logger.error('File do not exists on path ' + file);
						reject('File do not exists on path ' + file);
					} else {
						logger.info('Found file on path ' + file);
						var dcMetaData = JSON.parse(jsonminify(fs.readFileSync(file, 'utf8')));
						// console.log('File data ', dcMetaData);
						resolve(dcMetaData);
					}
				})
			}

			if(typeof device === 'string' && device.indexOf("/") > -1) {
				//File path
				if(device.indexOf('~') > -1) {
					return Promise.reject('Only accepts absolute path, invalid parameter ' + device);
				}
				return checkAndReadFile(device).then(function(dcMetaData) {

				})
			} else if (typeof device === 'string' && device.indexOf("/") == -1) {
				//File name
				//Look for this file in resourceTypes directory
				var filepath = __dirname + '/../' + this._resourceDirectory + '/' + device;
				return checkAndReadFile(filepath).then(function(dcMetaData) {

				})
			} else if (typeof device === 'object' && typeof device.commandID === 'undefined' && typeof device.resourceSet === 'undefined') {

			} else {
				return Promise.reject('Invalid parameter, please specify filename or filepath or deviceJSONObject');
			}
		},
		/**
		 * Stop device controller
		 *
		 * @method start
		 * @param {String} resourceId Specify resourceID of the device controller to be stopped 
		 * @return {Promise} The success handler accepts no parameter. The failure
		 *  handler accepts a single error object.
		 */
		stop: function() {
			return 'Hello';
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