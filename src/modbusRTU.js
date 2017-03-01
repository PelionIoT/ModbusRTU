var fs = require('fs');
var jsonminify = require('jsonminify');
var handleBars = require('handlebars');
var mkdirp = require('mkdirp');
var Logger = require('./../utils/logger');
var DefinitionValidator = require('./deviceDefinitionSchemas');
var logger = new Logger( {moduleName: 'Manager', color: 'bgBlue'} );


var generic_templateDir = __dirname + '/../controllers/genericDeviceController';
var generic_controllerFileName = generic_templateDir + '/controller.js';
var state_template = generic_templateDir + '/stateTemplate.js';

var autogen_dir = __dirname + '/../controllers/autogenDeviceControllers';

var modbusDeviceDbPrefix = 'modbus.devices.';
var modbusDefinitionDbPrefix = 'modbus.definition.';

function generateResourceId(dcMetaData, siodev, relayId) {
	var resourceID;
	if(typeof dcMetaData.resourceID === 'undefined' || dcMetaData.resourceID.length === 0) {
		resourceID = new Buffer(dcMetaData.name.replace(/[/]/g,'_') +
			dcMetaData.deviceGenre.replace(/[/]/g,'_') +
			dcMetaData.slaveAddress +
			siodev.replace(/[/]/g,'') +
			relayId.replace(/[/]/g,'')).toString('base64').replace(/[^a-zA-Z0-9]/g,'');
	} else {
		resourceID = dcMetaData.resourceID.replace(/[^a-zA-Z0-9]/g,'');
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
					try {
 						var dcMetaData = JSON.parse(jsonminify(fs.readFileSync(file, 'utf8')));
 					} catch(e) {
 						logger.error('Failed to parse device definition ' + e + JSON.stringify(e));
 						reject(e);
 					}
					// console.log('File data ', dcMetaData);
					resolve(dcMetaData);
				}
			} else {
				reject('Could not read file ' + file);
			}
		});
	});
}

function checkAndReadDatabase(resourceID) {
	return ddb.local.get(modbusDeviceDbPrefix + resourceID).then(function(result) {
		return JSON.parse(result.siblings[0]);
	});
}

function validateDeviceDefinition(metadata) {
	return new Promise(function(resolve, reject) {
		var definition = DefinitionValidator.isValidDefinition(metadata);
		if(definition.valid) {
			resolve(definition.format);
		} else {
			reject('Failed to validate the device definition ' + JSON.stringify(definition.error));
		}
	});
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
		this._siodev = obj.siodev;
		this._relayId = obj.relayId;
		this._resourceDirectory = __dirname + '/../' + obj.resourceTypesDirectory;
		this._runtimeDirectory = __dirname + '/../' + obj.runtimeDirectory;

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

			if(typeof device === 'string' && device.indexOf("/") > -1) {
				//File path
				if(device.indexOf('~') > -1) {
					return Promise.reject('Only accepts absolute path, invalid parameter ' + device);
				}
				return checkAndReadFile(device).then(function(dcMetaData) {
					//Save this to a file so that it can be started on reboot
					return self.commands._startDeviceController(resp.metadata);
				});
			} else if (typeof device === 'string' && device.indexOf("/") == -1) {
				//File name or resourceID
				if(device.indexOf('.json') == -1) {
					//Got resourceID
					if(typeof self._deviceMetaData[device] === 'undefined') {
						return Promise.reject('Did not find any resource with this id ' + device);
					} else {
						return self.commands._startDeviceController(self._deviceMetaData[device]);
					}
				} else {
					//Look for this file in resourceTypes directory
					var filepath = this._resourceDirectory + '/' + device;
					return checkAndReadFile(filepath).then(function(dcMetaData) {
						//Save this to a file so that it can be started on reboot
						return self.commands._startDeviceController(resp.metadata);
					});
				}
			} else if (typeof device === 'object' && typeof device.commandID === 'undefined' && typeof device.resourceSet === 'undefined') {
				//Device metadata object
				//Figure out which schema scheme this object follows
				try {
					var dcMetaData = JSON.parse(JSON.stringify(device));

					return validateDeviceDefinition(dcMetaData).then(function(format) {
						var resourceID = generateResourceId(dcMetaData, self._siodev, self._relayId);
						//Save this to a file so that it can be started on reboot
        				if(format == 1 || format == 2) {
        					return self.commands._startDeviceController(dcMetaData);	
        				} else {
        					logger.info('Found format 3 schema format!');
        					return self.commands._transformRegisterRunsToInterfaces(dcMetaData);
        				}
					});
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
					return reject('Please specify resourceID, got undefined');
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
			});
		},
		enable: function(resourceID) {
			var self = this;
			if(typeof resourceID === 'undefined' || typeof resourceID.commandID !== 'undefined' || typeof resourceID.resourceSet !== 'undefined') {
				return Promise.reject('Please specify resourceID, got undefined');
			}
			if(typeof self._deviceMetaData[resourceID] != 'undefined') {
				self._deviceMetaData[resourceID].enable = true;
				return self.commands.save(self._deviceMetaData[resourceID], true).then(function() {
					self._deviceControllerState[resourceID] = 'enabled';
					return self.commands.start(resourceID);
				});
			} else {
				return 'Could not find resource with this id ' + resourceID;
			}
		},
		disable: function(resourceID) {
			var self = this;
			if(typeof resourceID === 'undefined' || typeof resourceID.commandID !== 'undefined' || typeof resourceID.resourceSet !== 'undefined') {
				return Promise.reject('Please specify resourceID, got undefined');
			}
			if(typeof self._deviceMetaData[resourceID] != 'undefined') {
				self._deviceMetaData[resourceID].enable = false;
				return self.commands.save(self._deviceMetaData[resourceID], true).then(function() {
					self._deviceControllerState[resourceID] = 'disabled';
					return self.commands.stop(resourceID);
				});
			} else {
				return 'Could not find resource with this id ' + resourceID;
			}
		},
		save: function(dcMetaData, overwrite) {
			var self = this;
			if(typeof dcMetaData === 'undefined' || typeof dcMetaData.commandID !== 'undefined' || typeof dcMetaData.resourceSet !== 'undefined') {
				return Promise.reject('Please specify device metadata, got undefined');
			}
			return new Promise(function(resolve, reject) {
				var resourceID = generateResourceId(dcMetaData, self._siodev, self._relayId);
				if(!!overwrite) {
                    return ddb.local.put(modbusDeviceDbPrefix + resourceID, JSON.stringify(dcMetaData)).then(function() {
                    	resolve({info: 'Saved successfully with filename and resourceID ' + resourceID, metadata: dcMetaData});	
                    });
				} else {
					logger.warn('Resource already exists- ' + resourceID + ', not saving it to database');
					logger.info('Reading the existing database and returning that metadata');
					return checkAndReadDatabase(resourceID).then(function(metadata) {
						resolve({info: 'Resource already exists', metadata: metadata});
					});
				}
			});
		},
		delete: function(resourceID) {
			var self = this;
			if(typeof resourceID === 'undefined' || typeof resourceID.commandID !== 'undefined' || typeof resourceID.resourceSet !== 'undefined') {
				return Promise.reject('Please specify resourceID, got undefined');
			}
			return new Promise(function(resolve, reject) {
				return self.commands.stop(resourceID, true).then(function() {
					dev$.forgetResource(resourceID);
					return ddb.local.delete(modbusDeviceDbPrefix + resourceID).then(function() {
						resolve('Device controller stopped and resource type delete for ' + resourceID);	
					});
				}, function(err) {
					reject('Could not delete ' + resourceID + ' error: ' + JSON.stringify(err));
				});
			});
		},
		remove: function(resourceID) {
			return this.commands.delete(resourceID);
		},
		shutdown: function() {
			logger.warn('Shutting down module in 5 seconds...');
			setTimeout(function() {
				process.exit(0);
			}, 5000);
		},
		listDevices: function() {
			return Object.keys(this._deviceMetaData);
		},
		getMetadata: function(resourceID) {
			return this._deviceMetaData[resourceID];
		},
		getFromDatabase: function(resourceID) {
			return checkAndReadDatabase(resourceID);
		},
		getAll: function() {
			return this._deviceMetaData;
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
		getTransportStatus: function() {
			return this._fc.getTransportStatus();
		},
		deleteRuntime: function() {
			var p = [];
			var self = this;

			return new Promise(function(resolve, reject) {
				Object.keys(self._deviceControllers).forEach(function(resourceID) {
					p.push(self.commands.delete(resourceID));
				});
				Promise.all(p).then(function() {
					logger.info('Deleted all resources');
					//Sanity check
					dev$.select('id=*').listResources().then(function(resources) {
						Object.keys(resources).forEach(function(id) {
							if(resources[id].type.indexOf('Core/Devices/ModbusRTU') > -1) {
								dev$.forgetResource(id);
							}
						});
					});
					self._fc.flushQueue();
					resolve();
				}, function(err) {
					logger.error('Deleting all resource failed with err ' + JSON.stringify(err));
					reject(err);
				});
			});
		},
		isSchedulerRunning: function() {
			return this._scheduler.isRunning();
		},
		flush: function(){
			return this._fc.flushQueue();
		},
		deleteAll: function() {
			return this.commands.deleteRuntime();
		},
		_startDeviceController: function(dcMetaData) {
			var self = this;
			return new Promise(function(resolve, reject) {
				//1. Generate unique resource ID
				var resourceID = generateResourceId(dcMetaData, self._siodev, self._relayId);
				logger.info('Using resource ID ' + resourceID);

				if(!dcMetaData.enable) {
			    	self._deviceMetaData[resourceID] = dcMetaData;
					logger.warn('Found disabled resource ' + resourceID + ', not starting device controller');
					return resolve('Found disabled resource ' + resourceID + ', not starting device controller');
				}

				//2. Register the resource type with devicejs
				var resourceTypeName = (dcMetaData.resourceType || "Core/Devices/ModbusRTU") + '/' + resourceID;
				var interfaces = (typeof dcMetaData.interfaces !== 'undefined') ? Object.keys(dcMetaData.interfaces) : Object.keys(dcMetaData.registers.interfaces);

				interfaces.push('Core/Interfaces/Metadata');

				var resourceConfig = {
					name: resourceTypeName,
					version: dcMetaData.version || "0.0.1",
					interfaces: interfaces
				};

				dev$.addResourceType(resourceConfig).then(function() {
					logger.info('Successfully added resource type ' + resourceTypeName);
                }, function(err) {
                    logger.error('Could not add resource type ' + JSON.stringify(err));
                    return reject('Could not add resource type ' + err);
                }).then(function() {
					dev$.listInterfaceTypes().then(function(interfaceTypes) {
                		//3. Handlebars controller

						var genericController = fs.readFileSync(generic_controllerFileName, 'utf8');
	                    var template = handleBars.compile(genericController);
	                    var data = {};
	                    data.controllerClassName = resourceID;
	                    data.resourceName = resourceTypeName;
	                    // data.allStates = JSON.parse(jsonminify(interfaceState));
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
				                        	interfaceTypes: interfaceTypes
				                        }).then(function() {
				    						self._deviceMetaData[resourceID] = dcMetaData;
				                        	self._deviceControllerState[resourceID] = 'running';
				                        	logger.info('Device instance created successfully ' + resourceID);
				                        	return self.commands.save(dcMetaData, !!dcMetaData.overwrite).then(function() {
												resolve('Started device controller with resourceID- ' + resourceID);
				                        	});
				                        }, function(err) {
				                        	logger.error('Could not start controller with resourceID ' + resourceID + ' error ' + err + JSON.stringify(err));
				                        	return reject('Could not start controller with resourceID ' + resourceID + ' error ' + err + JSON.stringify(err));
				                        });
			                        });
			                    });
				            });
	    				});
	    			}, function(err) {
	    				logger.error('Failed to get registered interfaces ' + JSON.stringify(err));
	    				return reject('Failed to get registered interfaces ' + JSON.stringify(err));
	    			});
                });
			});
		},
		_transformRegisterRunsToInterfaces: function(metadata) {
			var self = this;
			var registerRuns = metadata.registerRuns;
			delete metadata.registerRuns;

			var configurationRegisters = null;
			if(metadata.configurationRegisters) {
				configurationRegisters = metadata.configurationRegisters;
				delete metadata.configurationRegisters;
			}

			function getNext() {
				if(typeof registerRuns[0] !== 'undefined') {
					if(Object.keys(registerRuns[0].indexes).length === 0) {
						registerRuns.splice(0, 1);
					}
				}

				if(typeof registerRuns[0] !== 'undefined') {
					var i = Object.keys(registerRuns[0].indexes)[0];
					var run = registerRuns[0];

					var intf = run.indexes[i].interface;
					var da = run.dataAddress + i/1;
					var dcmd = metadata;
					dcmd.interfaces = {};
					dcmd.interfaces[intf] = {};
					dcmd.interfaces[intf].dataAddress = da;
					dcmd.interfaces[intf].range = 1;
					dcmd.interfaces[intf].pollingInterval = run.pollingInterval;
					dcmd.interfaces[intf].readFunctionCode = run.readFunctionCode;
					dcmd.interfaces[intf].writeFunctionCode = run.writeFunctionCode;
					dcmd.interfaces[intf].outgoingOperation = run.indexes[i].outgoingOperation;
					dcmd.interfaces[intf].name = run.indexes[i].name || 'Register' + dcmd.interfaces[intf].dataAddress;
					dcmd.interfaces[intf].description = run.indexes[i].description;
					dcmd.interfaces[intf].unit = run.indexes[i].unit;
					dcmd.interfaces[intf].eventThreshold = run.indexes[i].eventThreshold;
					dcmd.resourceID = dcmd.interfaces[intf].name + new Buffer(metadata.resourceIdPosfix.replace(/[/]/g,'_') +
										metadata.slaveAddress +
										self._siodev.replace(/[/]/g,'') +
										self._relayId.replace(/[/]/g,'')).toString('base64').replace(/[^a-zA-Z0-9]/g,'');

					delete registerRuns[0].indexes[i];

					return dcmd;
				} else {
					return null;
				}
			}

			//Had to deep copy the object- JSON.parse(JSON.stringify(info))
			// var devInfo = [];

			// var again = function() {
			// 	var info = getNext();
			// 	if(info) {
			// 		console.log('got info ', info);
			// 		devInfo.push(JSON.parse(JSON.stringify(info)));
			// 		setImmediate(function() {
			// 			again();	
			// 		});
			// 	} else {
			// 		console.log('devInfo ', devInfo);
			// 		return;
			// 	}
			// };

			// setImmediate(function() {
			// 	again();	
			// });

			var response = [];
			return new Promise(function(resolve, reject) {
				function again() {
					var info = getNext();
					if(info) {
						logger.debug('Starting device controller on metadata ' + JSON.stringify(info));
						self.commands._startDeviceController(JSON.parse(JSON.stringify(info))).then(function(resp) {
							ddb.shared.put('WigWagUI:appData.resource.' + info.resourceID + '.name', JSON.stringify(info.interfaces[Object.keys(info.interfaces)[0]].name));
							response.push(resp);
							setImmediate(function() {
								again();	
							});
						}, function(err) {
							return reject(err);
						}).catch(function(err) {
							return reject(err);
						});
					} else {
						logger.info('Format 3 device controllers completed!');
						if(configurationRegisters) {
							logger.trace('Got configurationRegisters ' + JSON.stringify(configurationRegisters));
							var dcmd = metadata;

							dcmd.resourceID = 'ModbusRegistersS' + metadata.slaveAddress + new Buffer(metadata.resourceIdPosfix.replace(/[/]/g,'_') +
										metadata.slaveAddress +
										self._siodev.replace(/[/]/g,'') +
										self._relayId.replace(/[/]/g,'')).toString('base64').replace(/[^a-zA-Z0-9]/g,'');
							dcmd.configurationRuns = {};
							dcmd.interfaces = { "Core/Interfaces/Configuration": {} };
							configurationRegisters.forEach(function(run) {
								dcmd.configurationRuns[run.dataAddress] = {};
								dcmd.configurationRuns[run.dataAddress].dataAddress = run.dataAddress;
								dcmd.configurationRuns[run.dataAddress].range = run.range;
								dcmd.configurationRuns[run.dataAddress].pollingInterval = run.pollingInterval;
								dcmd.configurationRuns[run.dataAddress].writeFunctionCode = run.writeFunctionCode;
								dcmd.configurationRuns[run.dataAddress].readFunctionCode = run.readFunctionCode;
								dcmd.configurationRuns[run.dataAddress].indexes = run.indexes;
							});
							self.commands._startDeviceController(dcmd).then(function(resp) {
								logger.info('Starting configurationRun controller');
								response.push(resp);
								return resolve(response);
							}, function(err) {
								logger.error('Failed with error ' + err + JSON.stringify(err));
								return reject(err);
							}).catch(function(err) {
								logger.error('Failed with error ' + err + JSON.stringify(err));
								return reject(err);
							});
						} else {
							return resolve(response);
						}
					}
				}

				again();
			});
		},
		_startResourcesFromDirectory: function() {
			var self = this;
			var p = [];
			return new Promise(function(resolve, reject) {
				return fs.readdir(self._resourceDirectory, function (err, files) {
		            if(err) {
		            	if(err.code === 'ENOENT') {
		            		logger.warn('Could not find resouce directory. Nothing there to start, resolving...');
		            		return resolve();
		            	}
		                logger.error('Could not read the supported resource directory '+ self._resourceDirectory + ', error: ' + JSON.stringify(err));
		                reject('Could not read the supported resource directory '+ self._resourceDirectory + ', error: ' + JSON.stringify(err));
		                return;
		            }

		            function startController(filepath) {
	            		return checkAndReadFile(filepath).then(function(metadata) {
	            			return validateDeviceDefinition(metadata).then(function(format) {
	            				if(format == 1 || format == 2) {
	            					return self.commands._startDeviceController(metadata);	
	            				} else {
	            					logger.info('Found format 3 schema format!');
	            					return self.commands._transformRegisterRunsToInterfaces(metadata);
	            				}
	            			}, function(err) {
	            				logger.error('Failed to validate ' + err);
	            			});
	            		});
		            }

		            files.forEach(function(file) {
		            	var filepath = self._resourceDirectory + '/' + file;
						p.push(startController(filepath));
		            });

		          	Promise.all(p).then(function(result) {
		          		resolve(result);
		          	}, function(err) {
		          		reject(err);
		          	});
		        });
			});
		},
		_startResourcesFromDatabase: function() {
			var self = this;
			var nodes = {};
			function next(err, result) {
	            if(err) {
	                return;
	            }

	            var prefix = result.prefix;
	            var nodeId = result.key.substring(prefix.length);

	            var siblings = result.siblings;
	            if(siblings.length != 0) {
	                try {
	                    var deviceMetadata = JSON.parse(siblings[0]);
	                    nodes[nodeId] = deviceMetadata;
	                } catch(e) {
	                    logger.error("json parse failed with error- " + e);
	                }
	            } else {
	                logger.error("Key was deleted");
	            }
	        }
	        return ddb.local.getMatches(modbusDeviceDbPrefix, next).then(function() {
	            Object.keys(nodes).forEach(function(id) {
	            	// console.log('node ', nodes[id]);
	            	return validateDeviceDefinition(nodes[id]).then(function(format) {
        				if(format == 1 || format == 2) {
        					return self.commands._startDeviceController(nodes[id]);	
        				} else {
        					logger.info('Found format 3 schema format!');
        					return self.commands._transformRegisterRunsToInterfaces(nodes[id]);
        				}
        			}, function(err) {
        				logger.error('Failed to validate ' + err);
        			});
	            });
	        });
		},
		startAll: function() {
			var self = this;
			return self.commands._startResourcesFromDirectory().then(function() {
				//Database get high priority over directory. Directory is only to add new resources
				return self.commands._startResourcesFromDatabase();
			});
		},
		startAllResources: function() {
			return this.commands.startAll();
		},
		logLevel: function(level) {
			if(typeof level === 'number' && level >= 0) {
				global.GLOBAL.ModbusLogLevel = level;
			}
		},
		getState: function() {
			return !!this._state;
		},
		help: function() {
			//List the functions supported
			return Object.keys(this.commands);
		}
	}
};

module.exports = dev$.resource('ModbusRTU', ModbusRTU);