var Logger = require('./../../../utils/logger');
var logger = null;

var {{controllerClassName}} = {
    start: function(options) {
        logger = new Logger( {moduleName: '{{controllerClassName}}', color: 'greenBG'} );
        logger.info('starting controller');

        var self = this;

        this._fc = options.fc;
        this._id = options.resourceID;
        this._scheduler = options.scheduler;
        this._metadata = options.metadata;
        if(typeof options.metadata.interfaces !== 'undefined') {
            this._interfaces = options.metadata.interfaces;
        }
        if(typeof options.metadata.registers !== 'undefined')
            this._registers = options.metadata.registers;
        this._slaveAddress = options.metadata.slaveAddress;
        this._devjsInterfaces = options.interfaceTypes;
        this._facadeState = {};
        this._facadeData = {};

        this._configurationStates = [];

        if(this._interfaces && !this._metadata.configurationRuns) {
            //Register each interface polling to scheduler
            Object.keys(self._interfaces).forEach(function(intf) {
                if(typeof self._devjsInterfaces[intf] === 'undefined') {
                    logger.warn('Devicejs do not support this interface- ' + intf + '. This should not have happened!!');
                    return;
                }
                var facade = Object.keys(self._devjsInterfaces[intf]['0.0.1'].state)[0];
                if(typeof self._interfaces[intf].pollingInterval !== 'undefined') {
                    logger.info('Registering facade ' + facade + ' with scheduler at polling interval ' + self._interfaces[intf].pollingInterval + 'ms');
                    self._scheduler.registerCommand(
                                self._id, 
                                self._interfaces[intf].pollingInterval, 
                                facade,
                                self._slaveAddress,
                                self._interfaces[intf].dataAddress,
                                self._interfaces[intf].readFunctionCode);

                    self._facadeData[facade] = self._interfaces[intf];

                    self._scheduler.on(self._id + facade, function(state, data) {
                        logger.debug('State ' + state + ' got data ' + data);
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
                                data = self._fc.evalOperation(data, self._facadeData[state].outgoingOperation);
                                logger.info('Emitting event for state ' + state + ' data ' + data);
                                self.emit(state, data);
                            }
                        }
                    })
                }
            })
        } 

        if(this._metadata.configurationRuns) {
            //Got configuration runs
            Object.keys(this._metadata.configurationRuns).forEach(function(da) {
                logger.trace('REGISTERING CONFIGURATION POLL TO SCHEDULER');
                var run = self._metadata.configurationRuns[da];
                if(run.pollingInterval) {
                    logger.trace('GOT POLLING INTERVAL FOR DA  ' + da);
                    self._scheduler.registerCommand(
                        self._id,
                        run.pollingInterval,
                        da.toString() + 'configuration',
                        self._slaveAddress,
                        run.dataAddress,
                        run.readFunctionCode,
                        run.range
                        );

                    self._facadeData[da.toString() + 'configuration'] = run; 
                    self._configurationStates.push(da.toString() + 'configuration');

                    // console.log('_configurationStates ', self._configurationStates);

                    self._scheduler.on(self._id + da.toString() + 'configuration', function(state, data) {
                        logger.debug('State ' + state + ' got data ' + data);
                        if(typeof self._facadeState[state] === 'undefined') {
                            self._facadeState[state] = [];
                        }

                        if(data instanceof Array) {
                            if(self._facadeState[state] != data) {
                                data.forEach(function(element, index, array) {
                                    try {
                                        // console.log('state ', state + ' value ' + self._facadeState[state][index] + ' element ' + element);
                                        // console.log('facade data ', self._facadeData[state].indexes[index.toString()]);
                                        // console.log('Abs ', Math.abs(self._facadeState[state][index] - element));
                                        if(self._facadeState[state][index] != element) {
                                            if( (typeof element === 'string') ||
                                                (typeof self._facadeState[state][index] === 'undefined') ||
                                                (typeof element === 'object') ||
                                                (typeof element !== 'object' && typeof self._facadeData[state].indexes[index.toString()].eventThreshold === 'undefined') ||
                                                (typeof element !== 'object' && typeof self._facadeData[state].indexes[index.toString()].eventThreshold !== 'undefined'
                                                    && (Math.abs(self._facadeState[state][index] - element) >= self._facadeData[state].indexes[index.toString()].eventThreshold))
                                            ) {
                                                self._facadeState[state][index] = element;
                                                element = self._fc.evalOperation(element, self._facadeData[state].indexes[index.toString()].outgoingOperation);
                                                logger.info('Emitting event for state ' + state + ' data ' + element);
                                                self.emit('configuration', JSON.stringify({
                                                    dataAddress: da/1 + index,
                                                    value: element, 
                                                    name: self._facadeData[state].indexes[index.toString()].name,
                                                    description: self._facadeData[state].indexes[index.toString()].description
                                                }));
                                            }
                                        }
                                    } catch(e) {
                                        logger.error('Parsing response ' + e + state + data);
                                    }
                                });
                            }
                        }
                    });
                }
            });
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
                self._interfaces[intf].writeFunctionCode = self._registers.writeFunctionCode;
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
                    logger.debug('Register data- ' + registerData);

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

                            logger.debug('State ' + state + ' got data ' + data);
                            if(self._facadeState[state] != data) {
                                if( (typeof data === 'string') ||
                                    (typeof data === 'object') ||
                                    (typeof data !== 'object' && typeof self._interfaces[intf].eventThreshold === 'undefined') ||
                                    (typeof data !== 'object' && typeof self._interfaces[intf].eventThreshold !== 'undefined'
                                        && (Math.abs(self._facadeState[state] - data) >= self._interfaces[intf].eventThreshold))
                                ) {
                                    self._facadeState[state] = data;
                                    data = self._fc.evalOperation(data, self._interfaces[intf].outgoingOperation);
                                    logger.info('Emitting event for state ' + state + ' data ' + data);
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

        this._configurationStates.forEach(function(state) {
            self._scheduler.removeAllListeners(self._id + state);
        });
    },
    state: {
        power: {
            get: function(origin) {
                var self = this;
                var ret;
                return new Promise(function(resolve, reject) {
                    if(typeof self._interfaces['Facades/Switchable'] === 'undefined') {
                        return reject('This facade is not supported by controller');
                    }
                    if(typeof self._interfaces['Facades/Switchable'].readFunctionCode === 'undefined') {
                        return reject('This facade has no function code defined');
                    }
                    return self._fc.call(self._interfaces['Facades/Switchable'].readFunctionCode,
                        self._slaveAddress,
                        self._interfaces['Facades/Switchable'].dataAddress,
                        self._interfaces['Facades/Switchable'].range,
                        origin).then(function(data) {
                            ret = self._fc.evalOperation(data._response._data[0], self._interfaces['Facades/Switchable'].outgoingOperation);
                            logger.trace('Got power state ' + ret);
                            return resolve(ret);
                        }, function(err) {
                            return reject('Failed with error ' + err);
                        });
                });
            },
            set: function(value) {
                var self = this;
                value = (value === 'on') ? 1 : 0;
                return new Promise(function(resolve, reject) {
                    if(typeof self._interfaces['Facades/Switchable'].writeFunctionCode === 'undefined') {
                        return reject('This facade has no write function code defined');
                    }
                    return self._fc.call(self._interfaces['Facades/Switchable'].writeFunctionCode,
                        self._slaveAddress,
                        self._interfaces['Facades/Switchable'].dataAddress,
                        value).then(function() {
                            resolve();
                        }, function(err) {
                            reject(err);
                        });
                });
            }
        },
        register: {
            get: function(origin) {
                var self = this;
                var ret;
                return new Promise(function(resolve, reject) {
                    if(typeof self._interfaces['Facades/Register'] === 'undefined') {
                        return reject('This facade is not supported by controller');
                    }
                    if(typeof self._interfaces['Facades/Register'].readFunctionCode === 'undefined') {
                        return reject('This facade has no function code defined');
                    }
                    return self._fc.call(self._interfaces['Facades/Register'].readFunctionCode,
                        self._slaveAddress,
                        self._interfaces['Facades/Register'].dataAddress,
                        self._interfaces['Facades/Register'].range,
                        origin).then(function(data) {
                            ret = self._fc.evalOperation(data._response._data[0], self._interfaces['Facades/Register'].outgoingOperation);
                            logger.trace('Got register state ' + ret);
                            return resolve(ret);
                        }, function(err) {
                            return reject('Failed with error ' + err);
                        });
                })
            },
            set: function(value) {
                var self = this;
                return new Promise(function(resolve, reject) {
                    if(typeof self._interfaces['Facades/Register'].writeFunctionCode === 'undefined') {
                        return reject('This facade has no write function code defined');
                    }
                    return self._fc.call(self._interfaces['Facades/Register'].writeFunctionCode,
                        self._slaveAddress,
                        self._interfaces['Facades/Register'].dataAddress,
                        value).then(function() {
                            resolve();
                        }, function(err) {
                            reject(err);
                        });
                });
            }
        },
        temperature: {
            get: function(origin) {
                var self = this;
                var ret;
                return new Promise(function(resolve, reject) {
                    if(typeof self._interfaces['Facades/HasTemperature'] === 'undefined') {
                        return reject('This facade is not supported by controller');
                    }
                    if(typeof self._interfaces['Facades/HasTemperature'].readFunctionCode === 'undefined') {
                        return reject('This facade has no function code defined');
                    }
                    return self._fc.call(self._interfaces['Facades/HasTemperature'].readFunctionCode,
                        self._slaveAddress,
                        self._interfaces['Facades/HasTemperature'].dataAddress,
                        self._interfaces['Facades/HasTemperature'].range,
                        origin).then(function(data) {
                            ret = self._fc.evalOperation(data._response._data[0], self._interfaces['Facades/HasTemperature'].outgoingOperation);
                            logger.trace('Got temperature ' + ret);
                            return resolve(ret);
                        }, function(err) {
                            return reject('Failed with error ' + err);
                        });
                })
            },
            set: function(value) {
                return 'Not yet implemented';
            }
        },
        luminance: {
            get: function(origin) {
                var self = this;
                var ret;
                return new Promise(function(resolve, reject) {
                    if(typeof self._interfaces['Facades/HasLuminance'] === 'undefined') {
                        return reject('This facade is not supported by controller');
                    }
                    if(typeof self._interfaces['Facades/HasLuminance'].readFunctionCode === 'undefined') {
                        return reject('This facade has no function code defined');
                    }

                    return self._fc.call(self._interfaces['Facades/HasLuminance'].readFunctionCode,
                        self._slaveAddress,
                        self._interfaces['Facades/HasLuminance'].dataAddress,
                        self._interfaces['Facades/HasLuminance'].range,
                        origin).then(function(data) {
                            ret = self._fc.evalOperation(data._response._data[0], self._interfaces['Facades/HasLuminance'].outgoingOperation);
                            logger.trace('Got luminance ' + ret);
                            return resolve(ret);
                        }, function(err) {
                            return reject('Failed with error ' + err);
                        });
                })
            },
            set: function(value) {
                return 'Not yet implemented';
            }
        },
        configuration: {
            get: function(name, origin) {
                var self = this;
                var ret = {};
                var p = [];
                if(name && typeof name.resourceSet !== 'undefined') {
                    name = undefined;
                }

                if(origin && typeof origin.resourceSet !== 'undefined') {
                    origin = undefined;
                }
                return new Promise(function(resolve, reject) {
                    if(!self._metadata.configurationRuns) {
                        return reject('This facade is not supported by controller');
                    }
                    if(typeof name === 'undefined') {
                        Object.keys(self._metadata.configurationRuns).forEach(function(da) {
                            var run = self._metadata.configurationRuns[da];
                            if(run.readFunctionCode) {
                                ret[run.dataAddress] = [];
                                p.push(self._fc.call(run.readFunctionCode,
                                    self._slaveAddress,
                                    run.dataAddress,
                                    run.range,
                                    origin).then(function(data) {
                                        logger.info('For dataaddress ' + run.dataAddress + ' got response ' + data._response._data);
                                        data._response._data.forEach(function(element, i, a) {
                                            if(typeof run.indexes[i.toString()] !== 'undefined') {
                                                element = self._fc.evalOperation(element, run.indexes[i.toString()].outgoingOperation);
                                                ret[run.dataAddress][i] = {
                                                    value: element,
                                                    dataAddress: run.dataAddress + i,
                                                    name: run.indexes[i.toString()].name,
                                                    description: run.indexes[i.toString()].description
                                                }
                                            }
                                        });
                                        // ret[run.dataAddress] = data._response._data;
                                    }, function(err) {
                                        ret[run.dataAddress] = "Error- " + err;
                                    }).catch(function(err) {
                                        ret[run.dataAddress] = 'Error- ' + err;
                                    })
                                );
                            }
                        });

                        Promise.all(p).then(function() {
                            resolve(ret);
                        }, function(err) {
                            reject(err);
                        })
                    } else {
                        logger.debug('Got name ' + name);
                        var run = null;
                        Object.keys(self._metadata.configurationRuns).forEach(function(da) {
                            for(var j = 0; j < Object.keys(self._metadata.configurationRuns[da].indexes).length; j++) {
                                var index = Object.keys(self._metadata.configurationRuns[da].indexes)[j] / 1;
                                try {
                                    if((typeof name === 'string' && self._metadata.configurationRuns[da].indexes[index].name == name) || 
                                        (typeof name === 'number' && (self._metadata.configurationRuns[da].dataAddress + index) == name)) {
                                        run = self._metadata.configurationRuns[da].indexes[index];
                                        run.dataAddress = self._metadata.configurationRuns[da].dataAddress + index;
                                        run.readFunctionCode = self._metadata.configurationRuns[da].readFunctionCode;
                                        break;
                                    }
                                } catch(e) {
                                    logger.error('Error ' + e + JSON.stringify(e));
                                    return reject(e);
                                }
                            }
                        });

                        if(run == null) {
                            return reject(new Error('Could not find the data address in device definition. Make sure the name or dataaddress passed as argument is in device definition!'));
                        }

                        logger.info('Getting individual configuration register ' + JSON.stringify(run));

                        if(typeof run.readFunctionCode === 'undefined') {
                            return reject('This facade has no read function code defined');
                        }
                        self._fc.call(run.readFunctionCode,
                            self._slaveAddress,
                            run.dataAddress,
                            1,
                            origin).then(function(data) {
                                logger.info('For dataaddress ' + run.dataAddress + ' got response ' + data._response._data);
                                ret.value = self._fc.evalOperation(data._response._data[0], run.outgoingOperation);
                                ret.dataAddress = run.dataAddress;
                                ret.name = run.name;
                                ret.description = run.description;
                                resolve(ret);
                            }, function(err) {
                                reject(err);
                            });
                    }
                })
            }, 
            set: function(obj) {
                var self = this;
                var value = obj.value;
                var name = obj.name;
                if(typeof value === 'undefined' || typeof value.selection !== 'undefined' || typeof value.resourceSet !== 'undefined') {
                    return Promise.reject(new Error('Got undefined value, please define the value and dataAddress!'));
                }

                if((typeof name === 'undefined') || 
                    (typeof name.resourceSet !== 'undefined')) {
                    return Promise.reject(new Error('Please define name or data address of the register'));
                }

                var run = null;
                Object.keys(self._metadata.configurationRuns).forEach(function(da) {
                    for(var j = 0; j < Object.keys(self._metadata.configurationRuns[da].indexes).length; j++) {
                        var index = Object.keys(self._metadata.configurationRuns[da].indexes)[j] / 1;
                        if((typeof name === 'string' && self._metadata.configurationRuns[da].indexes[index].name == name) || 
                            (typeof name === 'number' && (self._metadata.configurationRuns[da].dataAddress + index) == name)) {
                            run = self._metadata.configurationRuns[da].indexes[index];
                            run.dataAddress = self._metadata.configurationRuns[da].dataAddress + index;
                            run.writeFunctionCode = self._metadata.configurationRuns[da].writeFunctionCode;
                            break;
                        }
                    }
                })

                if(run == null) {
                    return Promise.reject(new Error('Could not find the data address in device definition. Make sure the name or dataaddress passed as argument is in device definition!'));
                }

                logger.info('Setting register ' + JSON.stringify(run));

                return new Promise(function(resolve, reject) {
                    if(typeof run.writeFunctionCode === 'undefined') {
                        return reject('This facade has no write function code defined');
                    }
                    return self._fc.call(run.writeFunctionCode,
                        self._slaveAddress,
                        run.dataAddress,
                        value).then(function() {
                            resolve();
                        }, function(err) {
                            reject(err);
                        });
                });


            }
        }
    },
    getState: function() {
        var s = {};
        var p = [];
        var self = this;

        Object.keys(self.state).forEach(function(interface) {
            p.push(new Promise(function(resolve, reject) {
                    self.state[interface].get().then(function(value) {
                    if(value != null) {
                        s[interface] = value;
                    }
                    resolve();
                }).catch(function(e) {
                    if(!/This facade is not supported by controller/.test(e)) {
                        logger.error('Failed to get state- ' + interface + ', error- ' + e);
                    }
                    resolve();
                })
            }));
        });

        return Promise.all(p).then(function() {
            return s;
        });
    },
    setState: function(value) {
        var self = this;

        var p = [];

        return new Promise(function(resolve, reject) {

            self.getState().then(function(obj) {
                Object.keys(value).forEach(function(key) {
                    if(typeof obj[key] != 'undefined') {
                        if(JSON.stringify(obj[key]) != JSON.stringify(value[key])) {
                            p.push(self.state[key].set(value[key]));
                        }
                    } else {
                        logger.error('This should not have happened, got key which is not returned by getstate- ' + key);
                    }
                });

                Promise.all(p).then(function() {
                    resolve();
                }, function(err) {
                    reject(err);
                });
            });

        })
    },
    commands: {
        on: function() {
            return this.state.power.set('on');
        },
        off: function() {
            return this.state.power.set('off');
        },
        metadata: function() {
            return JSON.stringify(this._metadata);
        },
        info: function() {
            return this._metadata;
        },
        getInfo: function() {
            return this._metadata;
        },
        getMetadata: function() {
            return this._metadata;
        },
        getSlaveAddress: function() {
            return this._slaveAddress;
        },
        getInterfaces: function() {
            return this._interfaces;
        },
        getConfiguration: function(name) {
            return this.state.configuration.get(name);
        },
        setConfiguration: function(value, name) {
            return this.state.configuration.set({value: value, name: name});
        },
        setToDefault: function() {
            return 'Not supported';
        },
        getFacadeData: function() {
            return this._facadeData;
        }
    }
};

module.exports = dev$.resource('{{resourceName}}', {{controllerClassName}});