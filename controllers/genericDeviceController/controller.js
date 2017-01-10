var Logger = require('./../../../utils/logger');
var logger = null;

var {{controllerClassName}} = {
    start: function(options) {
        var logger = new Logger( {moduleName: '{{controllerClassName}}' + options.resourceID, color: 'white'} );
        logger.info('starting controller');
        var self = this;

        this._fc = options.fc;
        this._id = options.resourceID;
        this._interfaces = options.metadata.interfaces;
        this._slaveAddress = options.metadata.slaveAddress;

        //Register each interface polling to scheduler
        //Listen for events from scheduler
        
        //"reachable" event
        // this.modbusRTU.on('reachable ' + this.nodeId, function(value) {
        //     if(value){
        //         logger.info('reachable, came online');
        //         self.emit('reachable');
        //     }
        //     else {
        //         logger.info('unreachable, went offline');
        //         self.emit('unreachable')
        //     }
        // });
    },
    stop: function() {
    },
    state: {
        power: {
            get: function() {
                if(typeof this._interfaces['Facades/Switchable'] === 'undefined') {
                    return Promise.reject('This facade is not supported by this controller');
                }
                return this._fc.readHoldingRegisters(
                    this._slaveAddress, 
                    this._interfaces['Facades/Switchable'].dataAddress, 
                    this._interfaces['Facades/Switchable'].range, 
                    function(err, data) {
                    if(err) {
                        return Promise.reject('Failed with error ' + err)
                    }   
                    return Promise.resolve(data);
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