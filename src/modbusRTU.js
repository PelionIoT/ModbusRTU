var fs = require('fs');
var jsonminify = require('jsonminify');
var handleBars = require('handlebars');
var mkdirp = require('mkdirp');
var Logger = require('./../utils/logger');
var logger = new Logger( {moduleName: 'Manager', color: 'bgBlue'} );


var generic_templateDir = __dirname + '/../controllers/genericDeviceController';
var generic_controllerFileName = generic_templateDir + '/controller.js';

var autogen_dir = __dirname + '/../controllers/autogenDeviceTypes';

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
			var self = this;
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
					//1. Generate unique resource ID
					var resourceID = dcMetaData.resourceID;
					if(typeof dcMetaData.resourceID === 'undefined' || dcMetaData.resourceID.length == 0) {
						resourceID = dcMetaData.name.replace(/[/]/g,'_') + dcMetaData.deviceGenre.replace(/[/]/g,'_') + dcMetaData.slaveAddress;
					}

					logger.info('Using resource ID ' + resourceID);

					//2. Register the resource type with devicejs
					var resourceTypeName = (dcMetaData.resourceType || "Core/Devices/ModbusRTU") + '/' + resourceID;
					var interfaces = Object.keys(dcMetaData.interfaces);

					var resourceConfig = {
						name: resourceTypeName,
						version: dcMetaData.version || "0.0.1",
						interfaces: interfaces
					}

					dev$.addResourceType(resourceConfig).then(function() {
						logger.info('Successfully added resource type ' + resourceTypeName);
                    }, function(err) {
                        logger.error('Could not add resource type ' + err);
                    }).then(function() {
                    	//3. Handlebars controller
						var genericController = fs.readFileSync(generic_controllerFileName, 'utf8');
	                    var template = handleBars.compile(genericController);
	                    var data = {};
	                    data.controllerClassName = resourceID;
	                    data.resourceName = resourceTypeName;  
	                    genericController = template(data);

	    				var controller_dir = autogen_dir + '/' + resourceID;
	    				mkdirp(autogen_dir, function(err) { // path was created unless there was error
					        if(err) {
					            logger.error(autogen_dir + ' dir could not be created ' + err);
					            return;
					        } 
				            mkdirp(controller_dir, function(err) {
				                if(err) {
				                    logger.error(controller_dir + ' dir could not be created ' +  err);
				                    return;
				                }
			                    fs.writeFile(controller_dir + '/controller.js', genericController, function(err) {
			                        if(err) {
			                            logger.error('Could not create controller.js for resource '+ resourceID + err);
			                            return;
			                        }
			                        logger.info('Created ' + resourceID + ' controller.js file');
			                        var deviceController = require(controller_dir + '/controller');
			                        var temp = new deviceController(resourceID);
			                        temp.start({fc: self._fc, resourceID: resourceID, metadata: dcMetaData}).then(function() {
			                        	logger.info('Device instance created successfully');
			                        })
			                    });
				            })
					    });
                    })

					
				})
			} else if (typeof device === 'string' && device.indexOf("/") == -1) {
				//File name
				//Look for this file in resourceTypes directory
				var filepath = __dirname + '/../' + this._resourceDirectory + '/' + device;
				return checkAndReadFile(filepath).then(function(dcMetaData) {

				})
			} else if (typeof device === 'object' && typeof device.commandID === 'undefined' && typeof device.resourceSet === 'undefined') {
				try {
					var dcMetaData = JSON.parse(JSON.stringify(device));
					return Promise.resolve(dcMetaData);
				} catch(e) {
					logger.error('Failed to parse JSON object ' + e);
					return Promise.reject('Failed to parse JSON object ' + e);
				}
			} else {
				return Promise.reject('Invalid parameter, please specify filename or absolute filepath or device metadata JSONObject');
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