/*
*
* SMS Central control.
*
*/
var SMSCenter = function() {
	this._numbers = [];
}

SMSCenter.prototype.addNumber = function(numberClass) {
	this._numbers.push(new NumberClass(numberClass));
}

SMSCenter.prototype.addMessage = function(message, callback) {
	this._numbers.sort(function() {return 0.5 - Math.random()})
	
	var addedMessage = false;
	var lowestNumber = 20000;
	var lowestNumberClass = null;
	console.log(JSON.stringify(message));
	for (var i = 0; i < this._numbers.length && !addedMessage; i++) {
		//console.log(JSON.stringify(this._numbers[i]));
		if (this._numbers[i].getCount() < lowestNumber) {
			lowestNumber = this._numbers[i].getCount();
			lowestNumberClass = this._numbers[i];
		}
		if (this._numbers[i].hasRoom()) {

			this._numbers[i].addMessage(message.username, message.message, message.address, callback);
			//console.log("Added Message to: " + JSON.stringify(this._numbers[i]));
			addedMessage = true;
		}
	}
	if (!addedMessage) {
		lowestNumberClass.addMessage(message.username, message.message, message.address, callback);
	}
}

/*
* 
* SMS Number Classes
* 
*/
function NumberClass (Address) {
	var self = this;
	//console.log(Address);
	this._messages = [];
	this._maxPerMinute = 10;
	this._messagesRemaining = 10;
	this._address = Address;

	this.timer = function () {
		setTimeout(function() {
			self._messagesRemaining = self._maxPerMinute;
			for (var i = 0; i < self._messages.length; i++) {
			    if (self._messages[i] == undefined) {         
			      	self._messages.splice(i, 1);
					i--;
				}
			}
			self.sendMessages();
			//console.log("------------LLOOOOPPP--------------");
			self.doTimer();
		},60000);
	}
	
	this.doTimer = function() {
		self.timer();
	}

	this.timer();
}

NumberClass.prototype.addMessage = function (username, msg, recipient, callback) {
	//console.log("addMessage");
	this._messages.push({username: username, message: msg, address: recipient, callback: callback});
	this.sendMessages();
}

NumberClass.prototype.sendMessages = function() {
	//console.log("sendMessages");

	if (this._messagesRemaining >= 1) {
		var toDelete = [];
		for (var i = 0; i < this._maxPerMinute; i++)
		{
			if (this._messages[i] != undefined) {
				this.sendMessage(this._messages[i]);
				delete this._messages[i];
				
				//toDelete.push(i);
				this._messagesRemaining--;
			}
			else {
				delete this._messages[i];
				//toDelete.push(i);
			}
		}
	}
}

NumberClass.prototype.sendMessage = function(msg) {
	console.log("sendMessage");
	var self = this;
	var sms = new smsified.SMSified('.....', '.....');
	//console.log(JSON.stringify(msg));
	var options = {senderAddress: this._address, address: msg.address, message: msg.message};
	sms.sendMessage(options, function(result) {
		if (!result.requestError) {
			msg.callback(msg.username, msg.address, msg.message);
		}

		console.log(self._address + " " + JSON.stringify(result));
	});
}

NumberClass.prototype.hasRoom = function() {
	if (this._messagesRemaining >= 1) {
		return true;
	}
	else {
		return false;
	}
}

NumberClass.prototype.getCount = function() {
	return this._messages.length;
}

exports.SMSCenter = new SMSCenter();