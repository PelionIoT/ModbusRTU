var Logger = require('./../../../utils/logger');
var logger = null;

var {{controllerClassName}} = {
    start: function(options) {
        logger = new Logger( {moduleName: '{{controllerClassName}}', color: 'white'} );
        logger.info('starting controller');
        var self = this;

        this._fc = options.fc;
        this._id = options.resourceID;
        this._scheduler = options.scheduler;
        if(typeof options.metadata.interfaces !== 'undefined')
            this._interfaces = options.metadata.interfaces;
        if(typeof options.metadata.registers !== 'undefined')
            this._registers = options.metadata.registers;
        this._slaveAddress = options.metadata.slaveAddress;
        this._devjsInterfaces = options.interfaceTypes;
        this._facadeState = {};
        this._facadeData = {};

        if(this._interfaces) {
            //Register each interface polling to scheduler
            Object.keys(self._interfaces).forEach(function(intf) {
                if(typeof self._devjsInterfaces[intf] === 'undefined') {
                    logger.warn('Devicejs do not support this interface- ' + intf + '. This should not have happened!!');
                    return;
                }
                var facade = Object.keys(self._devjsInterfaces[intf]['0.0.1'].state)[0];
                if(typeof self._interfaces[intf].pollingInterval !== 'undefined') {
                    logger.info('Registering facade ' + facade + ' with scheduler at polling interval ' + self._interfaces[intf].pollingInterval + 'ms');
                    self._scheduler.registerCommand(self._id, self._interfaces[intf].pollingInterval, facade);

                    self._facadeData[facade] = self._interfaces[intf];

                    self._scheduler.on(self._id + facade, function(state, data) {
                        logger.info('Polling data- ' + data + ' for state ' + state);
                        if(typeof self._facadeState[state] === 'undefined') {
                            self._facadeState[state] = null;
                        }

                        if(self._facadeState[state] != data) {
                            if( (typeof data === 'string') ||
                                (typeof data === 'object') ||
                                (typeof data !== 'object' && typeof self._facadeData[facade].eventThreshold === 'undefined') ||
                                (typeof data !== 'object' && typeof self._facadeData[facade].eventThreshold !== 'undefined'
                                    && (Math.abs(self._facadeState[state] - data) >= self._facadeData[facade].eventThreshold))
                            ) {
                                self._facadeState[state] = data;
                                self.emit(state, data);
                            }
                        }
                    })
                }
            })
        }

        if(this._registers) {
            this._interfaces = {};
            Object.keys(self._registers.interfaces).forEach(function(intf) {
                if(typeof self._devjsInterfaces[intf] === 'undefined') {
                    logger.warn('Devicejs do not support this interface- ' + intf + '. This should not have happened!!');
                    return;
                }
                self._interfaces[intf] = {};

                self._interfaces[intf].dataAddress = self._registers.dataAddress + self._registers.interfaces[intf].index;
                self._interfaces[intf].index = self._registers.interfaces[intf].index;
                self._interfaces[intf].outgoingOperation = self._registers.interfaces[intf].outgoingOperation;
                self._interfaces[intf].range = 1;
                self._interfaces[intf].readFunctionCode = self._registers.readFunctionCode;
                self._interfaces[intf].eventThreshold = self._registers.interfaces[intf].eventThreshold;
                self._interfaces[intf].unit = self._registers.interfaces[intf].unit;
                self._interfaces[intf].pollingInterval = self._registers.pollingInterval;
            });

            self._interfaces['Facades/Register'] = {};
            self._interfaces['Facades/Register'].dataAddress = self._registers.dataAddress;
            self._interfaces['Facades/Register'].range = self._registers.range;
            self._interfaces['Facades/Register'].pollingInterval = self._registers.pollingInterval;
            self._interfaces['Facades/Register'].readFunctionCode = self._registers.readFunctionCode;
            //outgoingoperation
            //unit
            //eventthreshold

            if(typeof self._registers.pollingInterval !== 'undefined') {
                logger.info('Registering Facades/Register with scheduler at pollingInterval ' + self._registers.pollingInterval + 'ms');
                self._scheduler.registerCommand(self._id, self._registers.pollingInterval, 'register');

                self._scheduler.on(self._id + 'register', function(registerState, registerData) {
                    logger.debug('Polling register data- ' + registerData);

                    Object.keys(self._interfaces).forEach(function(intf) {
                        var state = Object.keys(self._devjsInterfaces[intf]['0.0.1'].state)[0];
                        if(typeof self._facadeState[state] === 'undefined') {
                            self._facadeState[state] = null;
                        }

                        if(typeof self._interfaces[intf].index !== 'undefined') {
                            var data;
                            try {
                                data = registerData[self._interfaces[intf].index];
                            } catch(e) {
                                logger.error('Failed to get facade data for ' + state + ' error ' + e);
                            }

                            logger.info('Facade ' + state + ' got data ' + data);
                            if(self._facadeState[state] != data) {
                                if( (typeof data === 'string') ||
                                    (typeof data === 'object') ||
                                    (typeof data !== 'object' && typeof self._interfaces[intf].eventThreshold === 'undefined') ||
                                    (typeof data !== 'object' && typeof self._interfaces[intf].eventThreshold !== 'undefined'
                                        && (Math.abs(self._facadeState[state] - data) >= self._interfaces[intf].eventThreshold))
                                ) {
                                    logger.debug('Emitting event for state ' + state + ' data ' + data);
                                    self._facadeState[state] = data;
                                    self.emit(state, data);
                                }
                            }
                        }
                    })
                });
            }
        }

        //This should always be reachable
        self.emit('reachable');
    },
    stop: function() {
        var self = this;
        this._scheduler.deleteResourceScheduler(this._id);
        Object.keys(this.state).forEach(function(facade) {
            self._scheduler.removeAllListeners(self._id + facade);
        })
    },
    state: {
        power: {
            get: function() {
                var self = this;
                var ret;
                return new Promise(function(resolve, reject) {
                    if(typeof self._interfaces['Facades/Switchable'] === 'undefined') {
                        return reject('This facade is not supported by controller');
                    }
                    if(typeof self._interfaces['Facades/Switchable'].readFunctionCode === 'undefined') {
                        return reject('This facade has no function code defined');
                    }
                    return self._fc.call(self._interfaces['Facades/Switchable'].readFunctionCode)(
                        self._slaveAddress,
                        self._interfaces['Facades/Switchable'].dataAddress,
                        self._interfaces['Facades/Switchable'].range,
                        function(err, data) {
                        if(err) {
                            return reject('Failed with error ' + err)
                        }
                        ret = self._fc.evalOperation(data._response._data[0], self._interfaces['Facades/Switchable'].outgoingOperation);
                        logger.trace('Got power state ' + ret);
                        return resolve(ret);
                    });
                });
            },
            set: function(value) {
                return 'Not yet implemented';
            }
        },
        register: {
            get: function() {
                var self = this;
                var ret;
                return new Promise(function(resolve, reject) {
                    if(typeof self._interfaces['Facades/Register'] === 'undefined') {
                        return reject('This facade is not supported by controller');
                    }
                    if(typeof self._interfaces['Facades/Register'].readFunctionCode === 'undefined') {
                        return reject('This facade has no function code defined');
                    }
                    return self._fc.call(self._interfaces['Facades/Register'].readFunctionCode)(
                        self._slaveAddress,
                        self._interfaces['Facades/Register'].dataAddress,
                        self._interfaces['Facades/Register'].range,
                        function(err, data) {
                        if(err) {
                            return reject('Failed with error ' + err)
                        }
                        ret = data._response._data;
                        logger.info('Got register ' + ret);
                        return resolve(ret);
                    })
                })
            },
            set: function(value) {
                return 'Not yet implemented';
            }
        },
        temperature: {
            get: function() {
                var self = this;
                var ret;
                return new Promise(function(resolve, reject) {
                    if(typeof self._interfaces['Facades/HasTemperature'] === 'undefined') {
                        return reject('This facade is not supported by controller');
                    }
                    if(typeof self._interfaces['Facades/HasTemperature'].readFunctionCode === 'undefined') {
                        return reject('This facade has no function code defined');
                    }
                    return self._fc.call(self._interfaces['Facades/HasTemperature'].readFunctionCode)(
                        self._slaveAddress,
                        self._interfaces['Facades/HasTemperature'].dataAddress,
                        self._interfaces['Facades/HasTemperature'].range,
                        function(err, data) {
                        if(err) {
                            return reject('Failed with error ' + err)
                        }
                        ret = self._fc.evalOperation(data._response._data[0], self._interfaces['Facades/HasTemperature'].outgoingOperation);
                        logger.trace('Got temperature ' + ret);
                        return resolve(ret);
                    })
                })
            },
            set: function(value) {
                return 'Not yet implemented';
            }
        },
        luminance: {
            get: function() {
                var self = this;
                var ret;
                return new Promise(function(resolve, reject) {
                    if(typeof self._interfaces['Facades/HasLuminance'] === 'undefined') {
                        return reject('This facade is not supported by controller');
                    }
                    if(typeof self._interfaces['Facades/HasLuminance'].readFunctionCode === 'undefined') {
                        return reject('This facade has no function code defined');
                    }

                    return self._fc.call(self._interfaces['Facades/HasLuminance'].readFunctionCode)(
                        self._slaveAddress,
                        self._interfaces['Facades/HasLuminance'].dataAddress,
                        self._interfaces['Facades/HasLuminance'].range,
                        function(err, data) {
                        if(err) {
                            return reject('Failed with error ' + err)
                        }
                        ret = self._fc.evalOperation(data._response._data[0], self._interfaces['Facades/HasLuminance'].outgoingOperation);
                        logger.trace('Got luminance ' + ret);
                        return resolve(ret);
                    })
                })
            },
            set: function(value) {
                return 'Not yet implemented';
            }
        }
    },
    getState: function() {
    },
    setState: function(devState) {
    },
    commands: {
        on: function() {
            return this.state.power.set('on');
        },
        off: function() {
            return this.state.power.set('off');
        }
    }
};

module.exports = dev$.resource('{{resourceName}}', {{controllerClassName}});