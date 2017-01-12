var fs = require('fs');
var jsonminify = require('jsonminify');
var handleBars = require('handlebars');
var mkdirp = require('mkdirp');
var Logger = require('./../utils/logger');
var logger = new Logger( {moduleName: 'Manager', color: 'bgBlue'} );


var generic_templateDir = __dirname + '/../controllers/genericDeviceController';
var generic_controllerFileName = generic_templateDir + '/controller.js';

var autogen_dir = __dirname + '/../controllers/autogenDeviceControllers';


function generateResourceId(dcMetaData) {
	var resourceID = dcMetaData.resourceID;
	if(typeof dcMetaData.resourceID === 'undefined' || dcMetaData.resourceID.length == 0) {
		resourceID = dcMetaData.name.replace(/[/]/g,'_') + dcMetaData.deviceGenre.replace(/[/]/g,'_') + dcMetaData.slaveAddress;
	}
	return resourceID;
}

function checkAndReadFile(file) {
	return new Promise(function(resolve, reject) {
		fs.stat(file, function(err, stats) {
			if(err) {
				return reject('Could not read file, file stat failed- ' + JSON.stringify(err));
			}
			if(stats.isFile() !== 'undefined') {
				if(!fs.existsSync(file)) {
					logger.error('File do not exists on path ' + file);
					reject('File do not exists on path ' + file);
				} else {
					logger.info('Found file on path ' + file);
					var dcMetaData = JSON.parse(jsonminify(fs.readFileSync(file, 'utf8')));
					// console.log('File data ', dcMetaData);
					resolve(dcMetaData);
				}
			} else {
				reject('Could not read file ' + file);
			}
		})
	})
}

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
		this._scheduler = obj.scheduler;
		this._resourceDirectory = obj.resourceTypesDirectory;
		this._runtimeDirectory = obj.runtimeDirectory;

		this._deviceControllers = {};
		this._deviceMetaData = {};
		this._deviceControllerState = {};
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

			function startDeviceController(dcMetaData) {
				return new Promise(function(resolve, reject) {
					//1. Generate unique resource ID
					var resourceID = generateResourceId(dcMetaData);
					logger.info('Using resource ID ' + resourceID);

					if(!dcMetaData.enable) {
				    	self._deviceMetaData[resourceID] = dcMetaData;
						logger.warn('Found disabled resource ' + resourceID + ', not starting device controller');
						return resolve('Found disabled resource ' + resourceID + ', not starting device controller')
					}


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
	                    return reject('Could not add resource type ' + err);
	                }).then(function() {
						dev$.listInterfaceTypes().then(function(interfaces) {
	                	//3. Handlebars controller
							var genericController = fs.readFileSync(generic_controllerFileName, 'utf8');
		                    var template = handleBars.compile(genericController);
		                    var data = {};
		                    data.controllerClassName = resourceID;
		                    data.resourceName = resourceTypeName;  
		                    genericController = template(data);

		    				var controller_dir = autogen_dir + '/' + resourceID;
		    				mkdirp(autogen_dir, function(err) {
		    					if(err) {
				                    logger.error(autogen_dir + ' dir could not be created ' +  err);
				                    return reject('Could not create directory ' + autogen_dir + ' error ' + err);
		    					}
					            mkdirp(controller_dir, function(err) {
					                if(err) {
					                    logger.error(controller_dir + ' dir could not be created ' +  err);
					                    return reject('Could not create directory ' + controller_dir + ' error ' + err);
					                }
				                    fs.writeFile(controller_dir + '/controller.js', genericController, function(err) {
				                        if(err) {
				                            logger.error('Could not create controller.js for resource '+ resourceID + err);
				                            return reject('Could not create device controller file, error ' + err);
				                        }
				                        logger.info('Created ' + resourceID + ' controller.js file');
				                        var deviceController = require(controller_dir + '/controller');

				                        //Stop if this controller is already running
				                        self.commands.stop(resourceID, true).then(function() {
				                        	self._deviceControllers[resourceID] = new deviceController(resourceID);
					                        self._deviceControllers[resourceID].start({
					                        	fc: self._fc, 
					                        	resourceID: resourceID, 
					                        	scheduler: self._scheduler, 
					                        	metadata: dcMetaData,
					                        	interfaces: interfaces
					                        }).then(function() {
					    						self._deviceMetaData[resourceID] = dcMetaData;
					                        	self._deviceControllerState[resourceID] = 'running';
					                        	logger.info('Device instance created successfully ' + resourceID);
					                        	resolve('Started device controller with resourceID- ' + resourceID);
					                        }, function(err) {
					                        	logger.error('Could not start controller with resourceID ' + resourceID + ' error ' + JSON.stringify(err));
					                        	return reject('Could not start controller with resourceID ' + resourceID + ' error ' + JSON.stringify(err));
					                        });
				                        })
				                    });
					            })
		    				})
		    			}, function(err) {
		    				logger.error('Failed to get registered interfaces ' + JSON.stringify(err));
		    				return reject('Failed to get registered interfaces ' + JSON.stringify(err));
		    			});
	                })
				})
			}

			if(typeof device === 'string' && device.indexOf("/") > -1) {
				//File path
				if(device.indexOf('~') > -1) {
					return Promise.reject('Only accepts absolute path, invalid parameter ' + device);
				}
				return checkAndReadFile(device).then(function(dcMetaData) {
					//Save this to a file so that it can be started on reboot
					return self.commands.save(dcMetaData, !!dcMetaData.overwrite).then(function(resp) {
						return startDeviceController(resp.metaData);
					})
				})
			} else if (typeof device === 'string' && device.indexOf("/") == -1) {
				//File name or resourceID
				if(device.indexOf('.json') == -1) {
					//Got resourceID
					if(typeof self._deviceMetaData[device] === 'undefined') {
						return Promise.reject('Did not find any resource with this id ' + device);
					} else {
						return startDeviceController(self._deviceMetaData[device]);
					}
				} else {
					//Look for this file in resourceTypes directory
					var filepath = __dirname + '/../' + this._resourceDirectory + '/' + device;
					return checkAndReadFile(filepath).then(function(dcMetaData) {
						//Save this to a file so that it can be started on reboot
						return self.commands.save(dcMetaData, !!dcMetaData.overwrite).then(function(resp) {
							return startDeviceController(resp.metaData);
						})
					})	
				}
			} else if (typeof device === 'object' && typeof device.commandID === 'undefined' && typeof device.resourceSet === 'undefined') {
				//Device metadata object
				try {
					var dcMetaData = JSON.parse(JSON.stringify(device));
					var resourceID = generateResourceId(dcMetaData);
					//Save this to a file so that it can be started on reboot
					return self.commands.save(dcMetaData, true).then(function(resp) {
						return startDeviceController(resp.metaData);
					})
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
		stop: function(resourceID, cleanMemory) {
			var self = this;
			return new Promise(function(resolve, reject) {
				if(typeof resourceID === 'undefined' || typeof resourceID.commandID !== 'undefined' || typeof resourceID.resourceSet !== 'undefined') {
					return reject('Please specify resourceID, got undefined')
				}
				if(typeof self._deviceControllers[resourceID] === 'undefined') {
					logger.warn('Could not find running device controller with resourceID ' + resourceID);
					return resolve();
				}

				logger.warn('Stopping running device controller with resourceID ' + resourceID);
				self._deviceControllers[resourceID].stop();	
				self._deviceControllerState[resourceID] = 'stopped';
				if(typeof cleanMemory !== 'object' && !!cleanMemory) {
					delete self._deviceControllers[resourceID];
					delete self._deviceMetaData[resourceID];
					self._deviceControllerState[resourceID] = 'deleted';
				}
				resolve();
			})
		},
		enable: function(resourceID) {
			var self = this;
			if(typeof resourceID === 'undefined' || typeof resourceID.commandID !== 'undefined' || typeof resourceID.resourceSet !== 'undefined') {
				return Promise.reject('Please specify resourceID, got undefined')
			}
			if(typeof self._deviceMetaData[resourceID] != 'undefined') {
				self._deviceMetaData[resourceID].enable = true;
				return self.commands.save(self._deviceMetaData[resourceID], true).then(function() {
					self._deviceControllerState[resourceID] = 'enabled';
					return self.commands.start(resourceID);
				})
			} else {
				return 'Could not find resource with this id ' + resourceID;
			}
		},
		disable: function(resourceID) {
			var self = this;
			if(typeof resourceID === 'undefined' || typeof resourceID.commandID !== 'undefined' || typeof resourceID.resourceSet !== 'undefined') {
				return Promise.reject('Please specify resourceID, got undefined')
			}
			if(typeof self._deviceMetaData[resourceID] != 'undefined') {
				self._deviceMetaData[resourceID].enable = false;
				return self.commands.save(self._deviceMetaData[resourceID], true).then(function() {
					self._deviceControllerState[resourceID] = 'disabled';
					return self.commands.stop(resourceID);
				})
			} else {
				return 'Could not find resource with this id ' + resourceID;
			}
		},
		save: function(dcMetaData, overwrite) {
			var self = this;
			if(typeof dcMetaData === 'undefined' || typeof dcMetaData.commandID !== 'undefined' || typeof dcMetaData.resourceSet !== 'undefined') {
				return Promise.reject('Please specify device metadata, got undefined')
			}
			return new Promise(function(resolve, reject) {
				var resourceID = generateResourceId(dcMetaData);
				var path = self._runtimeDirectory + '/' + resourceID + '.json';
				if(!fs.existsSync(path) || !!overwrite) {
					return mkdirp(self._runtimeDirectory, function(err) {
						if(err) {
							return reject(err);
						}
						return fs.writeFile(path, JSON.stringify(dcMetaData, null, 4), function(err) {
			                if(err) {
			                    logger.error('Could not save resource type '+ resourceID + ', error: ' + JSON.stringify(err));
			                    reject('Could not save resource type '+ resourceID + ', error: ' + JSON.stringify(err));
			                } else {
			                    logger.info('Created ' + path + ' successfully');
								resolve({info: 'Saved successfully with filename and resourceID ' + resourceID, metaData: dcMetaData});
			                }
			            });	
					})
				} else {
					logger.warn('File already exists- ' + resourceID + ', not saving it to runtime directory');
					logger.info('Reading the existing file and returning that metadata');
					return checkAndReadFile(path).then(function(metaData) {
						resolve({info: 'File already exists', metaData: metaData});
					})
				}
			})
		},
		delete: function(resourceID) {
			var self = this;
			if(typeof resourceID === 'undefined' || typeof resourceID.commandID !== 'undefined' || typeof resourceID.resourceSet !== 'undefined') {
				return Promise.reject('Please specify resourceID, got undefined')
			}
			return new Promise(function(resolve, reject) {
				return self.commands.stop(resourceID, true).then(function() {
					fs.unlinkSync(self._runtimeDirectory + '/' + resourceID + '.json')	
					resolve('Device controller stopped and resource type delete for ' + resourceID);
				}, function(err) {
					reject('Could not delete ' + resourceID + ' error: ' + JSON.stringify(err));
				});
			})
		},
		remove: function(resourceID) {
			return this.commands.delete(resourceID);
		},
		execute: function(resourceID, facade) {
			if(typeof this._deviceControllers[resourceID] !== 'undefined') {
				return this._deviceControllers[resourceID].state[facade].get();
			} else {
				logger.warn('Cannot execute command as no device controller found, this should not have happened');
				return Promise.reject();
			}
		},
		shutdown: function() {
			logger.info('Shutting down module in 5 seconds');
			setTimeout(function() {
				process.exit(0);
			}, 5000)
		},
		listDevices: function() {
			return Object.keys(this._deviceControllers);
		},
		listResources: function() {
			return this.commands.listDevices();
		},
		listResourceStates: function() {
			return this._deviceControllerState;
		},
		listSchedulerCommands: function() {
			return this._scheduler.listRegisteredCommands();
		},
		deleteRuntime: function() {
			var p = [];
			var self = this;

			return new Promise(function(resolve, reject) {
				Object.keys(self._deviceControllers).forEach(function(resourceID) {
					p.push(self.commands.delete(resourceID));	
				})
				Promise.all(p).then(function() {
					logger.info('Deleted all resources');
					resolve();
				}, function(err) {
					logger.error('Deleting all resource failed with err ' + JSON.stringify(err));
					reject(err);
				})
			})
		},
		deleteAll: function() {
			return this.commands.deleteRuntime();
		},	
		startAll: function() {
			var self = this;
			var p = [];
			return new Promise(function(resolve, reject) {
		        return fs.readdir(self._resourceDirectory, function (err, files) {
		            if(err) {
		                logger.error('Could not read the supported resource directory '+ self._resourceDirectory + ', error: ' + JSON.stringify(err));
		                reject('Could not read the supported resource directory '+ self._resourceDirectory + ', error: ' + JSON.stringify(err));
		                return;
		            }

		            files.forEach(function(file) {
		            	// p.push(self.commands.save(self._resourceDirectory + '/' + file, false));
			            p.push(self.commands.start(file));
		            });

		          	Promise.all(p).then(function(result) {
		          		resolve(result);
		          	}, function(err) {
		          		reject(err);
		          	})
		        });
			})
		},
		// startAll: function() {
		// 	var self = this;
		// 	var p = [];
		// 	return new Promise(function(resolve, reject) {
		// 		return self.commands.createRuntimeDeviceTypes().then(function() {
		// 			return fs.readdir(self._runtimeDirectory, function (err, files) {
		// 	            if(err) {
		// 	                logger.error('Could not read the runtime resource directory '+ self._runtimeDirectory + ', error: ' + JSON.stringify(err));
		// 	                reject('Could not read the runtime resource directory '+ self._runtimeDirectory + ', error: ' + JSON.stringify(err));
		// 	                return;
		// 	            }

		// 	            logger.info('Supported resource types- ' + JSON.stringify(files));
		// 	            files.forEach(function(file) {
		// 	            	p.push(self.commands.start(file));
		// 	            });

		// 	          	Promise.all(p).then(function(result) {
		// 	          		resolve(result);
		// 	          	}, function(err) {
		// 	          		reject(err);
		// 	          	})
		// 	        });
		// 		})	
		// 	})
		// },
		startAllResources: function() {
			return this.commands.startAll();
		},
		help: function() {
			//List the functions supported
			return Object.keys(this.commands);
			// {
			// 	start: 'Start device controller based on filename, filepath, resourceId or device meta data JSON object',
			// 	stop: 'Stop already running device controller based on resourceId'
			// }
		}
	}
}

module.exports = dev$.resource('ModbusRTU', ModbusRTU);