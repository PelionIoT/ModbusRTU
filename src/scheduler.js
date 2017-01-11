var Logger = require('./../utils/logger');
var EventEmitter = require('events').EventEmitter;

var logger = new Logger( { moduleName: 'Scheduler', color: 'magenta'} );

var Scheduler = function(options) {
	logger.info('Starting scheduler with options ' + JSON.stringify(options));

	this._schedulerIntervalResolution = options.schedulerIntervalResolution || 500;

	if(typeof options.schedulerIntervalResolution != 'undefined' && options.schedulerIntervalResolution < 500) {
		this._schedulerIntervalResolution = 500;
	}

	this._pollingCommands = {};
}

Scheduler.prototype = Object.create(EventEmitter.prototype);

Scheduler.prototype.start = function(modbusRTU) {
	var self = this;
	this._modbusRTU = modbusRTU;

	logger.info('Starting scheduler polling timer at ' + this._schedulerIntervalResolution + 'ms');

	this._globalInterval = setInterval(function() {
		//Check if resource command is registerd to be polled
		self._updateCounters();
	}, this._schedulerIntervalResolution);
}

Scheduler.prototype.stop = function() {
	logger.info('Stopping scheduler polling timer');
	clearInterval(this._globalInterval);
}

Scheduler.prototype.registerCommand = function(resourceId, pollingInterval, facade) {
	// var facade = Object.keys(command)[0];

	//Find if any command is registered from this resourceId
	if(typeof this._pollingCommands[resourceId] === 'undefined') {
		this._pollingCommands[resourceId] = {};
	}

	//Update the command registered by this resourceId
	this._pollingCommands[resourceId][facade] = {};
	// this._pollingCommands[resourceId][facade].deviceController = deviceController;
	// this._pollingCommands[resourceId][facade].command = command[facade];
	var pollingTokens = Math.ceil(pollingInterval / this._schedulerIntervalResolution);
	this._pollingCommands[resourceId][facade].tokens = (pollingTokens > 0) ? pollingTokens : 1;
	this._pollingCommands[resourceId][facade].counter = 0;
}

Scheduler.prototype.unregisterCommand = function(resourceId, facade) {
	// var facade = Object.keys(command)[0];
	if(typeof this._pollingCommands[resourceId][facade] !== 'undefined')
		delete this._pollingCommands[resourceId][facade];
}

Scheduler.prototype.deleteResourceScheduler = function(resourceId) {
	if(typeof this._pollingCommands[resourceId] !== 'undefined')
		delete this._pollingCommands[resourceId];
}

Scheduler.prototype.listRegisteredCommands = function() {
	return this._pollingCommands;
}

Scheduler.prototype._updateCounters = function() {
	var self = this;
	Object.keys(self._pollingCommands).forEach(function(resourceId) {
		Object.keys(self._pollingCommands[resourceId]).forEach(function(facade) {
			self._pollingCommands[resourceId][facade].counter++;
			if(self._pollingCommands[resourceId][facade].counter == self._pollingCommands[resourceId][facade].tokens) {
				logger.debug('Executing facade ' + facade + ' of resourceId ' + resourceId);
				self._pollingCommands[resourceId][facade].counter = 0;
				self.execute(resourceId, facade);
			}
		})
	})
}

Scheduler.prototype.execute = function(resourceId, facade) {
	//Only supports reading holding registers
	var self = this;
	self._modbusRTU.commands.execute(resourceId, facade).then(function(response) {
		logger.trace('Got response from ' + resourceId + facade + ' resp ' + response);
		self.emit(resourceId + facade, facade, response);
	})
}

module.exports = Scheduler;