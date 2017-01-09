var deviceInfo = require('./zwave.json');
var Logger = require('./../../../utils/logger');
var logger = null;

var {{controllerClassName}} = {
    start: function(options) {
        var logger = new Logger( {moduleName: '{{controllerClassName}}' + options.node.id(), color: 'white'} );
        logger.info('starting controller');
        var self = this;

        this.nodeId = options.node.id();
        this.zwave = options.zwaveModule;
        this.commissioner = options.node.commissioner();
        this.commandClasses = options.node.commandClasses();
        this.comclassIds = options.node.commandClassIds();
        this.configuration = [];

        //We need to get fancy with this later when we implement config options
        //Need wakeup queue and all
        if(!options.node.isPaired()) {
            if(typeof deviceInfo.association !== 'undefined') {
                deviceInfo.association.forEach(function(groupIdentifier) {
                    self.commandClasses["association"].set(groupIdentifier, 1); //specify the group identifier and target node Id
                })
            }
            if(typeof deviceInfo.configurations !== 'undefined') {
                var p = [];
                Object.keys(deviceInfo.configurations).forEach(function(parameter) {
                    if(typeof self.commandClasses["configuration"] !== 'undefined') {
                        // temp.push({'parameter': parameter, 'size': deviceInfo.configurations[parameter].size, 'value': deviceInfo.configurations[parameter].default})
                        p.push(self.commandClasses["configuration"].set(parameter, deviceInfo.configurations[parameter].size, deviceInfo.configurations[parameter].default));
                    } else {
                        logger.error("Configuration command class is not defined but the device has configuration parameters");
                    }
                });

                Promise.all(p).then(function(value) {
                    logger.info('Configuration set successfully, get all the configurations to verify');

                    p = [];
                    Object.keys(deviceInfo.configurations).forEach(function(parameter) {
                        if(typeof self.commandClasses["configuration"] !== 'undefined') {
                            // temp.push({'parameter': parameter, 'size': deviceInfo.configurations[parameter].size, 'value': deviceInfo.configurations[parameter].default})
                            p.push(self.commandClasses["configuration"].get(parameter));
                        } else {
                            logger.error("Configuration command class is not defined but the device has configuration parameters");
                        }
                    }); 
                    Promise.all(p).then(function(value) {
                        logger.info('Configuration get successful- ' + JSON.stringify(value));

                        self.configuration = value;

                        ddb.local.get('zwave:devices.' + self.nodeId).then(function(nodeMetaData) {

                            if(nodeMetaData == null || nodeMetaData.siblings.length == 0) {
                                throw new Error('Not in the database');
                            }
                            var metaData = JSON.parse(nodeMetaData.siblings[0]);

                            metaData = Object.assign(metaData, {'configurations': self.configuration});
                            ddb.local.put('zwave:devices.' + self.nodeId, JSON.stringify(metaData)).then(function() {
                                logger.info('Wrote configuration successfully to database');
                            }, function(err) {
                                logger.error('Could not write device config to database- ' + JSON.stringify(err))
                            });
                        }, function(err) {
                            logger.error('Could not read this device database- ' + JSON.stringify(err));
                        }).then(function() {

                        }, function(err) {
                            logger.error('Not in the database- ' + err);
                        })
                    });
                }, function(err) {
                    logger.error('Configuration failed with error- ' + JSON.stringify(err));
                })
            }
        } else {
            //load the configurations
            ddb.local.get('zwave:devices.' + self.nodeId + '.configurations').then(function(nodeConf) {
                
                if(nodeConf == null || nodeConf.siblings.length == 0) {
                    throw new Error('Not in the database');
                }
                var conf = JSON.parse(nodeConf.siblings[0]);

                logger.info('Got device config from database- ' + JSON.stringify(conf));
                self.configuration = conf;
            }, function(err) {
                logger.info('Unable to retrieve device database- ' + JSON.stringify(err));
            }).then(function() {

            }, function(err) {
                logger.error('Not in the database- ' + err);
            })
        }

        //Listen for events
        this.commissioner.on('zwave ' + this.nodeId, function(comclass, value) {
            if(typeof deviceInfo.comclassDevjsEvents[comclass] !== 'undefined') {
                var interface = deviceInfo.comclassDevjsEvents[comclass];
                var data = value;

                if(comclass == 49) {
                    logger.info('Got value- ' + JSON.stringify(value));
                    interface = deviceInfo.comclassDevjsEvents[comclass][value.type];
                    data = value.sensorValue;
                }

                var obj = self.zwave.applySchema(interface, data);
                if(typeof obj.event !== 'undefined') {
                    self.emit(obj.event, obj.value);
                } else {
                    logger.warn('No event assigned to this devicejs interface- ' + JSON.stringify(obj));
                }   
            } else {
                logger.warn('No interface assigned to this comclass- ' + comclass);
            }
        });
        
        //"reachable" event
        this.zwave.on('reachable ' + this.nodeId, function(value) {
            if(value){
                logger.info('reachable, came online');
                self.emit('reachable');
            }
            else {
                logger.info('unreachable, went offline');
                self.emit('unreachable')
            }
        });
    },
    stop: function() {
    },
    state: {
        motion: {
            get: function() {
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["sensorBinary"]._commandClass];
                var value = this.commandClasses['sensorBinary'].getLocal();
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses['sensorBinary'].set(value);
            }
        },
        contact: {
            get: function() {
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["sensorBinary"]._commandClass];
                var value = this.commandClasses['sensorBinary'].getLocal() ^ 0xFF;
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses['sensorBinary'].set(value);
            }
        },
        battery: {
            get: function() {
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["battery"]._commandClass];
                var value = this.commandClasses['battery'].getLocal();
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses['battery'].set(value);
            }
        },
        tamper: {
            get: function() {
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["alarm"]._commandClass];
                var value = this.commandClasses['alarm'].getLocal();
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses["alarm"].set(value);
            }
        },
        wakeup: {
            get: function() {
                return this.commandClasses['wakeup'].getLocal();
            },
            set: function(value) {
                return this.commandClasses['wakeup'].set(value);
            }
        },
        vibration: {
            get: function() {
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["alarmSensor"]._commandClass];
                var value = this.commandClasses['alarmSensor'].getLocal();
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses['alarmSensor'].set(value);
            }
        },
        power: {
            get: function() {
                if(typeof this.commandClasses["switchBinary"] !== 'undefined') {
                    return this.commandClasses["switchBinary"].getLocal();
                } else {
                    return this.commandClasses["switchAll"].getLocal();  //as get on switch all returns the mode not the state 
                }
            },
            set: function(value) {
                if(typeof this.commandClasses["switchBinary"] !== 'undefined') {
                    return this.commandClasses["switchBinary"].set(value);
                } else {
                    return this.commandClasses["switchAll"].set(value);
                }
            }
        },
        brightness: {
            get: function() {
                return this.commandClasses['switchMultilevel'].getLocal();
            },
            set: function(value) {
                return this.commandClasses['switchMultilevel'].set(value);
            }
        },
        temperature: {
            get: function() {
                var type = Object.keys(deviceInfo.comclassDevjsEvents[this.commandClasses["sensorMultilevel"]._commandClass])[0]; //temperature
                var value = this.commandClasses['sensorMultilevel'].getLocal(type);
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["sensorMultilevel"]._commandClass][type];
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses['sensorMultilevel'].set(value);
            }
        },
        luminance: {
            get: function() {
                var type = Object.keys(deviceInfo.comclassDevjsEvents[this.commandClasses["sensorMultilevel"]._commandClass])[0]; //luminance
                var value = this.commandClasses['sensorMultilevel'].getLocal(type);
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["sensorMultilevel"]._commandClass][type];
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses['sensorMultilevel'].set(value);
            }
        },
        smoke: {
            get: function() {
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["alarm"]._commandClass];
                var value = this.commandClasses['alarm'].getLocal();
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses["alarm"].set(value);
            }
        },
        energy: {
            get: function() {
                var type = Object.keys(deviceInfo.comclassDevjsEvents[this.commandClasses["sensorMultilevel"]._commandClass])[0];
                var value = this.commandClasses['sensorMultilevel'].getLocal(type);
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["sensorMultilevel"]._commandClass][type];
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses['sensorMultilevel'].set(value);
            }
        },
        other: {
            get: function() {
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["sensorMultilevel"]._commandClass];
                var value = this.commandClasses['sensorMultilevel'].getLocal();
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses['sensorMultilevel'].set(value);
            }
        },
        thermostatMode: {
            get: function() {
                return this.commandClasses['thermostatMode'].getLocal();
            },
            set: function(value) {
                return this.commandClasses['thermostatMode'].set(value);
            }
        },
        thermostatOperatingState: {
            get: function() {
                return this.commandClasses['thermostatOperatingState'].getLocal();
            },
            set: function(value) {
                return this.commandClasses['thermostatOperatingState'].set(value);
            }
        },
        thermostatFanMode: {
            get: function() {
                return this.commandClasses['thermostatFanMode'].getLocal();
            },
            set: function(value) {
                return this.commandClasses['thermostatFanMode'].set(value);
            }
        },
        thermostatFanState: {
            get: function() {
                return this.commandClasses['thermostatFanState'].getLocal();
            },
            set: function(value) {
                return this.commandClasses['thermostatFanState'].set(value);
            }
        },
        setTemperatureLevel: {
            get: function() {
                var type = this.commandClasses['thermostatMode'].getLocal();
                return this.commandClasses['thermostatSetPoint'].getLocal(type);
            },
            set: function(value) {
                // var type = this.commandClasses['thermostatMode'].getLocal();
                return this.commandClasses['thermostatSetPoint'].set({type: value.mode, value: value.level});
            }
        },
        security: {
            get: function() {
                return this.commandClasses['security'].getLocal();
            },
            set: function(value) {
                return this.commandClasses['security'].set(value);
            }
        },
        lock: {
            get: function() {
                var devjsInterface = deviceInfo.comclassDevjsEvents[this.commandClasses["doorLock"]._commandClass];
                var value = this.commandClasses['doorLock'].getLocal();
                return this.zwave.applySchema(devjsInterface, value).value;
            },
            set: function(value) {
                return this.commandClasses['doorLock'].set(value);
            }
        },
        passCode: {
            get: function(options) {
                logger.info("Got options- " + JSON.stringify(options));
                if(options.attr == 'number') {
                    return this.commandClasses['userCode'].numberGet();
                } else if(options.attr == 'user') {
                    if(typeof options.userId != 'undefined')
                        return this.commandClasses['userCode'].get(options.userId);
                    else
                        return new Error('Specify the user identifier');
                } else {
                    return this.commandClasses['userCode'].numberGet();
                }
            },
            set: function(value) {
                return this.commandClasses['userCode'].set(value);
            }
        }
    },
    getState: function() {
        logger.info(this.nodeId + ' device state is- ', this.devState);
        return this.devState;
    },
    setState: function(devState) {
        if(typeof devState.power !== 'undefined' && devState.power == 'off') {
            return this.state.power.set('off');
        } else { //power is either not defined or its 'on'
            if(typeof devState.brightness !== 'undefined') {
                return this.state.brightness.set(devState.brightness);
            } else if(typeof devState.power !== 'undefined') { //brightness is not defined, thus only power is left
                return this.state.power.set('on');
            }
        }
    },
    commands: {
        on: function() {
            return this.state.power.set('on');
        },
        off: function() {
            return this.state.power.set('off');
        },
        unpair: function() {
            return dev$.selectByType('Zwave/DevicePairer').call('removeDevice');
        },
        energy: function() {
            return this.commandClasses['sensorMultilevel'].get('power');
        },
        temperature: function() {
            return this.commandClasses['sensorMultilevel'].get('temperature');
        },
        luminance: function() {
            return this.commandClasses['sensorMultilevel'].get('luminance');
        },
        configuration: function(parameter) {
            return this.commandClasses['configuration'].get(parameter);
        },
        getConfig: function() {
            return this.configuration;
        },
        getAllConfiguration: function() {
            var self = this;
            Object.keys(deviceInfo.configurations).forEach(function(parameter) {
                self.commandClasses["configuration"].get(parameter).then(function(resp) {
                    logger.info('configuration response- ' + JSON.stringify(resp));
                    self.configuration = Object.assign(self.configuration, resp);
                });
            });
            // Promise.all(p).then(function(value) {
            //     logger.info('GOT CONFIGURATION- ' +  JSON.stringify(value));
            //     self.configuration = value;
            // }, function(err) {
            //     logger.error('Configuration get failed with error- ' + err);
            // })
        },
        getConfiguration: function() {
            this.configuration.forEach(function(config) {
                if(typeof deviceInfo.configurations[config.parameter] !== 'undefined') {
                    deviceInfo.configurations[config.parameter].value = config.value;
                } else {
                    logger.error('Got unknow conifg parameter, this should not have happened');
                }
            });
            return JSON.stringify(deviceInfo.configurations);
        },
        setConfiguration: function(obj) {
            return new Error('not yet implemented');
        },
        setConfig: function(obj) {
            return this.commandClasses["configuration"].set(obj.parameter, obj.size, obj.value);
        },
        getSpecificConfig: function(parameter) {
            return this.commandClasses["configuration"].get(parameter);
        },
        removeAssociation: function(obj) {
            return this.commandClasses["association"].remove(obj.groupId, obj.target);
        }
    }
};

module.exports = dev$.resource('{{resourceName}}', {{controllerClassName}});