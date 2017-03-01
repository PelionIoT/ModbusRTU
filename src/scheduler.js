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
	this._isRunning = false;
	this._tokenDistributer = {};
	this._commandsToExecute = [];
	this._execute = 0;
}

Scheduler.prototype = Object.create(EventEmitter.prototype);

Scheduler.prototype.start = function(modbusRTU, functionCode) {
	var self = this;
	this._modbusRTU = modbusRTU;
	this._fc = functionCode;

	logger.info('Starting scheduler polling timer at ' + this._schedulerIntervalResolution + 'ms');
	this._isRunning = true;

	this._globalInterval = setInterval(function() {
		//Check if resource command is registerd to be polled
		self._updateCounters();
	}, this._schedulerIntervalResolution);
}

Scheduler.prototype.stop = function() {
	logger.info('Stopping scheduler polling timer');
	this._isRunning = false;
	clearInterval(this._globalInterval);
}

Scheduler.prototype.registerCommand = function(resourceId, pollingInterval, facade, slaveAddress, dataAddress, readFunctionCode, range) {
	// var facade = Object.keys(command)[0];
	var self = this;
	//Find if any command is registered from this resourceId
	if(typeof this._pollingCommands[resourceId] === 'undefined') {
		this._pollingCommands[resourceId] = {};
	}

	//Update the command registered by this resourceId
	this._pollingCommands[resourceId][facade] = {};
	var pollingTokens = Math.ceil(pollingInterval / this._schedulerIntervalResolution);
	this._pollingCommands[resourceId][facade].resourceId = resourceId;
	this._pollingCommands[resourceId][facade].facade = facade;
	var token = this._pollingCommands[resourceId][facade].tokens = (pollingTokens > 0) ? pollingTokens : 1;
	if(typeof this._tokenDistributer[token] === 'undefined') {
		//Check if this is a multiple of any stored token, if it is then use that counter to synchronize the commands 
		//Otherwise assign it zero
		for(var i = 0; i < Object.keys(self._tokenDistributer).length; i++) {
			var t = Object.keys(self._tokenDistributer)[i]/1;
			if((token % t) === 0) {
				self._tokenDistributer[token] = self._tokenDistributer[t];
				break;
			} else if((t % token) === 0) {
				self._tokenDistributer[token] = self._tokenDistributer[t];
				break;
			}
		}
		if(typeof this._tokenDistributer[token] === 'undefined') {
			this._tokenDistributer[token] = 0;	
		}
	}
	this._pollingCommands[resourceId][facade].range = range;
	this._pollingCommands[resourceId][facade].slaveAddress = slaveAddress;
	this._pollingCommands[resourceId][facade].dataAddress = dataAddress;
	this._pollingCommands[resourceId][facade].readFunctionCode = readFunctionCode;
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
	var executeTokens = [];
	Object.keys(self._tokenDistributer).forEach(function(token) {
		self._tokenDistributer[token]++;
		if(self._tokenDistributer[token] == token) {
			executeTokens.push(token/1);
			self._tokenDistributer[token] = 0;
		}
	});

	Object.keys(self._pollingCommands).forEach(function(resourceId) {
		Object.keys(self._pollingCommands[resourceId]).forEach(function(facade) {
			if(executeTokens.indexOf(self._pollingCommands[resourceId][facade].tokens) > -1) {
				logger.debug('Pushing command for execution, facade ' + facade + ' of resourceId ' + resourceId);
				self._commandsToExecute.push(self._pollingCommands[resourceId][facade]);
			}
		});
	});

	//Segregate commands for same slave address and read function code
	function getCommandsWithSameFunctionCode(sa, rfc) {
		var ret = [];
		self._commandsToExecute.forEach(function(command, index, array) {
			if(command.slaveAddress === sa && command.readFunctionCode === rfc) {
				ret.push(command);
			}
		});

		ret.forEach(function(command) {
			self._commandsToExecute.splice(self._commandsToExecute.indexOf(command), 1);
		});
		return ret;
	}

	//Get next batch of commands to execute and arrange them in data address ascending order
	function getNextCommandBatch() {
		if(self._commandsToExecute.length !== 0) {
			logger.info('Executing polling commands for intervals ' + JSON.stringify(executeTokens.map(function(e) { return (e * self._schedulerIntervalResolution); }) ) );

			logger.trace('Commands to execute ' + JSON.stringify(self._commandsToExecute));
			var sa = self._commandsToExecute[0].slaveAddress;
			var rfc = self._commandsToExecute[0].readFunctionCode;

			var subCommands = getCommandsWithSameFunctionCode(sa, rfc);
			subCommands = subCommands.sort(function(a, b) { return a.dataAddress - b.dataAddress; });
			return subCommands;
		} else {
			return null;
		}
	}

	//Club requests and create a register run
	function getOneRegisterRun(commands) {
		var commandsToSplice = [];
		var registerRun = {};

		registerRun.dataAddress = commands[0].dataAddress;
		registerRun.readFunctionCode = commands[0].readFunctionCode;
		registerRun.slaveAddress = commands[0].slaveAddress;
		registerRun.range = commands[0].range || 1;
		registerRun.eventSubsctiptionId = [];
		registerRun.eventSubsctiptionId.push(commands[0].resourceId + commands[0].facade);
		registerRun.state = [];
		registerRun.state.push(commands[0].facade);

		commandsToSplice.push(commands[0]);

		if(commands[0].range == 1 || !commands[0].range) {
			var temp = registerRun.dataAddress;
			for(var i = 1; i < commands.length; i++) {
				if((commands[i].dataAddress - temp) == 1) {
					registerRun.range++;
					registerRun.state.push(commands[i].facade);
					registerRun.eventSubsctiptionId.push(commands[i].resourceId + commands[i].facade);
					temp = commands[i].dataAddress;
					commandsToSplice.push(commands[i]);
				} else {
					break;
				}
			}
		}

		// console.log('commandsToSplice ', commandsToSplice);
		commandsToSplice.forEach(function(command) {
			commands.splice(commands.indexOf(command), 1);
		});

		return {commands: commands, registerRun: registerRun};
	}

	var registerRuns = [];
	var num = 0;
	function getSlaveRegisterRuns(commands) {
		var ret = getOneRegisterRun(commands);
		registerRuns[num] = ret.registerRun;
		num++;
		if(ret.commands.length !== 0) {
			getSlaveRegisterRuns(ret.commands);
		} else {
			return;
		}
	}

	function getAllRegisterRuns() {
		var commands = getNextCommandBatch();
		if(commands !== null) {
			getSlaveRegisterRuns(commands);	
			getAllRegisterRuns();
		} else {
			// logger.trace('Got register runs to execute ' + JSON.stringify(registerRuns));
			registerRuns.forEach(function(run) {
				self.execute(run);
			});
		}
	}

	getAllRegisterRuns();
};

Scheduler.prototype.execute = function(run) {
	//Only supports reading holding registers
	var self = this;
	if(typeof run.dataAddress !== 'undefined' && typeof run.readFunctionCode !== 'undefined') {
		logger.debug('Executing run ' + JSON.stringify(run));
		self._fc.call(run.readFunctionCode,
            run.slaveAddress,
            run.dataAddress,
            run.range,
            'scheduler').then(function(data) {
	            logger.trace('Got result for run ' + JSON.stringify(run));
	            logger.debug('Got result for run ' + data._response._data);
	            //Dirty hack to emit configuration run data
	            if(run.state[0] === run.dataAddress + 'configuration') {
	            	// logger.info('Emitting event with subscription id ' + run.eventSubsctiptionId[0]);
	            	self.emit(run.eventSubsctiptionId[0], run.state[0], data._response._data);
	            } else {
		            data._response._data.forEach(function(d, i, a) {
		            	self.emit(run.eventSubsctiptionId[i], run.state[i], d);
		            });
		        }
            }, function(err) {
            	return reject('Failed with error ' + err);
            });
	} else {
	}
	// 	self._modbusRTU.commands.execute(resourceId, facade).then(function(response) {
	// 		logger.trace('Got response from ' + resourceId + facade + ' resp ' + response);
	// 		self.emit(resourceId + facade, facade, response);
	// 	});
	// }
};

Scheduler.prototype.isRunning = function() {
	return this._isRunning;
};

module.exports = Scheduler;