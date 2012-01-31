var smsified = require('smsified');
var NumberClass = require('./number.js').NumberClass;
/*
*
* SMS Central control.
*
*/
var SMSCenter = function() {
	this._numbers = [];
}

// SMSCenter.prototype.getNumbers = function() {
// 	dbNumbers.all(function (err, doc) {
// 		for (var i = 0; i < doc.length; i++) {
// 			var currentItem = doc[i];
// 			console.log(currentItem.id);
// 			center.addNumber(currentItem.id, currentItem.type);
// 		}
// 	});
// 	// var number = new NumberClass("", "tropo");
// 	// center.addNumber("6042272418", "tropo");
// 	// center.addNumber("2898040379", "tropo");
// 	// center.addNumber("12898040379", "tropo");
// };

SMSCenter.prototype.addNumber = function(numberClass, type) {
	this._numbers.push(new NumberClass(numberClass, type));
}

SMSCenter.prototype.addMessage = function(message, callback) {
	var chosenNumber = 0;
	if (message.usingNumber) {
		chosenNumber = message.usingNumber;
		for (var i = 0; i < this._numbers.length && !addedMessage; i++) {
			if (this._numbers[i]._address === message.usingNumber) {
				this._numbers[i].addMessage(message.username, message.message, message.address, callback);
			}
		}
	}
	else {
		this._numbers.sort(function() {return 0.5 - Math.random()});
		chosenNumber = 0;
		var addedMessage = false;
		var lowestNumber = 20000;
		var lowestNumberClass = null;
		// console.log(JSON.stringify(message));
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
				chosenNumber = this._numbers[i]._address;
			}
		}
		if (!addedMessage) {
			lowestNumberClass.addMessage(message.username, message.message, message.address, callback);
			chosenNumber = lowestNumberClass._address;
		}
	}
	return chosenNumber;
}

exports.SMSCenter = SMSCenter;