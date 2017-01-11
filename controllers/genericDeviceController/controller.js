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
        this._interfaces = options.metadata.interfaces;
        this._slaveAddress = options.metadata.slaveAddress;
        this._devjsInterfaces = options.interfaces;
        this._facadeData = {};

        //Register each interface polling to scheduler
        Object.keys(self._interfaces).forEach(function(intf) {
            var facade = Object.keys(self._devjsInterfaces[intf]['0.0.1'].state)[0];
            if(typeof self._interfaces[intf].pollingInterval !== 'undefined') {
                logger.info('Registering facade ' + facade + ' with scheduler at polling interval ' + self._interfaces[intf].pollingInterval + 'ms');
                self._scheduler.registerCommand(self._id, self._interfaces[intf].pollingInterval, facade);

                //Listen for events from scheduler
                self._scheduler.on(self._id + facade, function(state, data) {
                    logger.trace('got data from polling ' + data);
                    if(typeof self._facadeData[state] === 'undefined') {
                        self._facadeData[state] = null;
                    }

                    if(self._facadeData[state] != data) {
                        self._facadeData[state] = data;
                        self.emit(state, data);
                    }
                })
            }
        })

        //This should always be reachable
        self.emit('reachable');
    },
    stop: function() {
        this._scheduler.deleteResourceScheduler(this._id);
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
                    return self._fc.readHoldingRegisters(
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
                    })
                })
            },
            set: function(value) {
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