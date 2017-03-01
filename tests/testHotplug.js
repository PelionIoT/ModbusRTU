var Discoverer = require('./../src/discoverer');

var discoverer = new Discoverer();

discoverer.on('newDeviceDiscovered', function(uuid) {
    console.log('found ', uuid);
    console.log('data ', discoverer.getDevice(uuid));
    discoverer.listDevices();
});

discoverer.on('deviceRemoved', function(uuid) {
    console.log('unpluged ', uuid);
});

discoverer.start().then(function() { 
    console.log('Started successfully');
});