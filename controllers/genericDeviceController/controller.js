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
        this.modbusRTU.on('reachable ' + this.nodeId, function(value) {
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
        }
    },
    getState: function() {
    },
    setState: function(devState) {    },
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