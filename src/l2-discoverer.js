var hotplug = require('node-udev');
var EventEmitter = require('events').EventEmitter;
var Logger = require('./../utils/logger');

var logger = new Logger( { moduleName: 'Hotplug', color: 'magenta'} );

var Discoverer = function() {
    var self = this;
    this._discoveredDevices = {};

    this._discovery = [
        {
             name: "Modbus modem",
             signature: {  // one or more keys to look for in hotplug data. All keys must match. Can be value or regex
                   "ID_SERIAL" : /FT232.*/,
                   "ID_BUS" : "usb",
                   "SUBSYSTEM": "tty"
             },
             onSeen: function(hotplugdata, info) {
                 logger.info("Found a Modbus modem");
                 logger.info("This is info on the attached/detached device: " + JSON.stringify(hotplugdata));
                 return hotplugdata.syspath; // return a string which is unique to this device. If this device is unplugged, and plugged
                                                    // back in, this string should be the same
             },
             onNew: function(hotplugdata, uuid, info) {
                logger.info("Modbus modem - onNew() ["+uuid+"]" + ' info ' + JSON.stringify(info));
                if(!self._discoveredDevices[uuid]) {
                    self._discoveredDevices[uuid] = hotplugdata;
                    self.emit('newDeviceDiscovered', uuid);
                }
             },
             onRemove: function(hotplugdata, uuid, info) {
                logger.info("Modbus modem - onRemove() ["+uuid+"]" + ' info ' + JSON.stringify(info));
                if(self._discoveredDevices[uuid]) {
                    delete self._discoveredDevices[uuid];
                    self.emit('deviceRemoved', uuid);
                } else {
                    logger.warn('Could not find discovered device with uuid [' + uuid + ']');
                }
             },
             onChange: function(hotplugdata_before, hotplugdata_after, uuid, info) {
                logger.info("Modbus modem - onChnage() ["+uuid+"]");
             }
        }
    ];

    function logError(str) {
        return logger.error(str);
    }

    function logInfo(str) {
        return logger.info(str);
    }

    hotplug.setErrorLogFunc(logError);
    hotplug.setInfoLogFunc(logInfo);
};

Discoverer.prototype = Object.create(EventEmitter.prototype);

Discoverer.prototype.start = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        hotplug.start({ hotplugDefs: self._discovery, verbose: false },function() {
            logger.info("Loaded. Success.");
            hotplug.scanForDevices();
            resolve();
        }, function() {
            logger.error("Error loading hotplugDefs. " + JSON.stringify(arguments));
            reject(arguments);
        });
    });
};

Discoverer.prototype.stop = function() {
    hotplug.stop();
};

Discoverer.prototype.getDevice = function(uuid) {
    return this._discoveredDevices[uuid];
};

Discoverer.prototype.listDevices = function() {
    logger.trace('Discovered devices are ' + Object.keys(this._discoveredDevices));
    return Object.keys(this._discoveredDevices);
};

module.exports = Discoverer;
