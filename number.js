var smsified = require('smsified');

/*
* 
* SMS Number Classes
* 
*/
function NumberClass (Address, type) {
	var self = this;
	//console.log(Address);
	this._messages = [];
	this._maxPerMinute = 1;
	this._messagesRemaining = 1;
	this._address = Address;
	if (type) {
		this._type = type;
	}
	else {
		this._type = "smsified"
	}

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
		},1000);
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
	var self = this;
	if (this._type == "smsified") {
		var sms = new smsified.SMSified('.....', '.....');
		console.log("USERNAME:::::::::: " + msg.username);
		var options = {senderAddress: this._address, address: msg.address, message: msg.message, notifyURL: "http://mytextmessages.nodester.com/messageStatus/" + msg.username+"/"};
		console.log("NumberClass.prototype.sendMessage: this._address = " + this._address + " msg.address = " + msg.address);
		sms.sendMessage(options, function(result) {
			console.log("RESULT!!!!!!!!!!!!11 " + result);
			// console.log("FROM USER ACCOUNT: " + msg.username + " PHONE NUMBER: " + self._address + ". RESULT: " + result);
			// if (!result.requestError) {

			// 	msg.callback({error: false, message: "Message successfully sent.", result: result});
			// }
			// else {
			// 	console.log("ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!!!: " + result);
			// 	msg.callback({error: true, message: "Message failed.", result: result});
			// }
		});
	}
	else if (this._type == "tropo") {
		// The token for your Tropo scripting app (the 'Messaging' token in your application settings).
		var token = "...............";
		// Create a new instance of the Tropo session object.
		var session = new tropoSession.TropoSession();

		// Invoke the makeApiCall() method and pass in token, message to send and number to send to.
		session.makeApiCall(token, {msg: msg.message, number: msg.address, usingNumber: this._address});
		// Write out put to console.
		session.addListener('responseBody', function(response) {
		  util.puts(response);
		});
	}
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

exports.NumberClass = NumberClass;