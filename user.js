// var SMSCenter = require('./central.js').SMSCenter;
var dbUsers;
var dbLogs;

var UserAccount = function(conn, userId, onSuccess, onFailure) {
	dbUsers = conn.database('anonysms_users');
	dbLogs = conn.database('anonysms_inbound');
	if (userId) {
		this._userId = userId;
		// console.log("UserAccount " + onFailure);
		this.userExists(onSuccess, onFailure);
	}
};

UserAccount.prototype.userExists = function(onS, onF) {
	// console.log("WTFBBQISHAPPENING? " + onF);
	console.log("UserAccount.userExists = " + this._userId);
	UserAccount.userExists(this._userId, onS, onF);
};

UserAccount.prototype.getUser = function(onSuccess, onFailure) {
	var s = function (response) {
		this._userDoc = response.doc;
		onSuccess(response);
	}
	UserAccount.getUser(this._userId, s, onFailure);
};

UserAccount.prototype.addUser = function(amount, onSuccess, onFailure) {
	// console.log("UserAccount.prototype.addUser: onSuccess: " + JSON.stringify(onSuccess));
	UserAccount.addUser(this._userId, amount, onSuccess, onFailure );
	return this;
};

UserAccount.prototype.setUser = function(userId, onSuccess, onFailure) {
	this._userId = userId;

	return this;
};

UserAccount.prototype.sendMessage = function(center, message, address, onSuccess, onFailure, usingNumber) {
	console.log("UserAccount.prototype.sendMessage: " + this._userId);
	this.logMessage(message, address, "outgoing");
	// this.subscribeToNumber(address);
	onSuccess({message: "Message sent to: " + address + ". Message: " + message});
	var numberUsed = UserAccount.send(this._userId, center, message, address, onSuccess, onFailure, usingNumber);
	this.subscribeToNumber(address, numberUsed);
	return numberUsed;
};

// UserAccount.prototype.sendMessageUsingCountry = function(center, message, address, onSuccess, onFailure, country) {
// 	console.log("UserAccount.prototype.sendMessage: " + this._userId);
// 	this.logMessage(message, address, "outgoing");
// 	// this.subscribeToNumber(address);
// 	onSuccess({message: "Message sent to: " + address + ". Message: " + message});
// 	var numberUsed = this.getNumberForUserByCountry(this._userId, country);
// 	UserAccount.send(this._userId, center, message, address, onSuccess, onFailure, numberUsed);
// 	this.subscribeToNumber(address, numberUsed);
// 	return numberUsed;
// };


UserAccount.prototype.logMessage = function(message, address, type) {
	UserAccount.logMessage(this._userId, message, address, type);
};

UserAccount.prototype.subscribeToNumber = function(address, usingNumber) {
	console.log("UserAccount.prototype.subscribeToNumber: address = " + address)
	UserAccount.subscribeToNumber(this._userId, address, usingNumber);
};

UserAccount.addUser = function(userId, amount, onSuccess, onFailure) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	// console.log("UserAccount.addUser: " + userId + " onSuccess: " + JSON.stringify(onSuccess));
	return dbUsers.save(userId, {
	    remaining: amount,
	    history: [],
	    newMessages: [],
	    activated: false,
	}, function(err, res) {
		if (err) {
			console.log("cannot add user: " + userId);
			if (onFailure) {
				try {
					onFailure({success: false, error: "User cannot be added."});
				}
				catch (ex) {
					// console.log(JSON.stringify(onSuccess));
				}
			}
		}
		else {
			console.log("added user: " + userId + " with " + amount + " credits.");
			if (onSuccess) {
				try {
					onSuccess({success: true, message: "User successfully added with " + amount + " credits.", remaining: amount});
				}
				catch (ex) {
					// console.log("UserAccount.onSuccess: " + JSON.stringify(onSuccess));
				}
			} 
		}
	});
};

UserAccount.prototype.getNewMessages = function (onSuccess, onFailure) {
	UserAccount.getNewMessages(this._userId, onSuccess, onFailure);
}

UserAccount.getNewMessages = function (userId, onSuccess, onFailure) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	console.log("UserAccount.getNewMessages: " + userId);

	dbUsers.get(userId, function (err, doc) {
	    if (err) {
	    	onFailure({exists: false, error: err});
	    }
	    else {
	    	if (doc.remaining === undefined) {
	    		onFailure({exists: false, doc: doc});
	    	}
	    	else {
		    	onSuccess({messages: doc.newMessages});
	    	}
	    }
	    
	});
}

UserAccount.prototype.getHistory = function (onSuccess, onFailure) {
	UserAccount.getHistory(this._userId, onSuccess, onFailure);
}

UserAccount.getHistory = function (userId, onSuccess, onFailure) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	dbUsers.get(userId, function (err, doc) {
	    if (err) {
	    	onFailure({exists: false, error: err});
	    }
	    else {
	    	if (doc.remaining === undefined) {
	    		onFailure({exists: false, doc: doc});
	    	}
	    	else {
		    	onSuccess({messages: doc.history});
	    	}
	    }
	    
	});
}

UserAccount.prototype.removeNewMessages = function (oldMessages, onSuccess, onFailure) {
	UserAccount.removeNewMessages(this._userId, oldMessages, onSuccess, onFailure);
}

UserAccount.removeNewMessages = function (userId, oldMessages, onSuccess, onFailure) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	console.log("UserAccount.removeNewMessages: " + userId);
	dbUsers.merge(userId, {newMessages: []}, function(err, doc) {
		console.log("erasedNewMessages!");
		if (!err) {
			onSuccess({newMessages: [], oldMessages: oldMessages});
		}
		else {
			onFailure({error: true, errorValue: err});
		}
	})
};

UserAccount.getUser = function(userId, onSuccess, onFailure) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	console.log("UserAccount.getUser: " + userId);
	dbUsers.get(userId, function (err, doc) {
	    if (err) {
	    	onFailure({exists: false});
	    }
	    else {
	    	if (doc.remaining === undefined) {
	    		onFailure({exists: false, doc: doc})
	    	}
	    	else {
		    	onSuccess({exists: true, doc: doc});
	    	}
	    }
	    
	});
};

UserAccount.userExists = function(userId, onS, onF) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	// console.log("UserAccount.userExists: " + JSON.stringify(onS));
	dbUsers.get(userId, function (err, doc) {
	    if (err) {
	    	console.log("USER DOES NOT EXIST. ERR.");
	    	onF({exists: false});
	    }
	    else {
	    	if (doc.remaining === undefined) {
	    		console.log("USER DOES NOT EXIST. DOC.REMAINING");
	    		onF({exists: false, doc: doc})
	    	}
	    	else {
	    		console.log("SUCCESS: USER DOES EXIST.");
		    	console.log(onS);
		    	onS({exists: true, doc: doc});
	    	}
	    }
	});
};

UserAccount.send = function(userId, center, message, number, onSuccess, onFailure, usingNumber) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	console.log("UserAccount.send: userId = " + userId + " address = " + number);
	return center.addMessage({username: userId, message: message, address: number, usingNumber: usingNumber}, onSuccess);
};


UserAccount.logMessage = function (userId, message, number, type) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	console.log("UserAccount.logMessage: " + userId);
	dbUsers.get(userId, function (err, doc) {
		if (!err) {
			// var remaining = doc.remaining-1;
			var history = doc.history;
			
			var now = new Date();
			var utc = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

			history.push({number: number, message: message, type: type, date: utc});
			dbUsers.merge(userId, {
				   // remaining: remaining,
				   history: history,
				}, function (err, res) {
			    // Handle response
			});
		}
		else {
			
		}
	});
};
UserAccount.prototype.removeCredits = function (amount) {
	UserAccount.removeCredits(this._userId, amount);
}
UserAccount.removeCredits = function (userId, amount) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	console.log("UserAccount.logMessage: " + userId);
	dbUsers.get(userId, function (err, doc) {
		if (!err) {
			var remaining = doc.remaining-amount;
			dbUsers.merge(userId, {
				   remaining: remaining,
				}, function (err, res) {
			    // Handle response
			});
		}
		else {
			
		}
	});
};

UserAccount.subscribeToNumber = function (userId, number, usingNumber) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	console.log("UserAccount.subscribeToNumber: userId = " + userId + " number = " + number + " usingNumber = " + usingNumber);

	dbLogs.get(number, function (err, doc) {
		console.log(doc);
		console.log(userId);
		if (!err && doc.Subscribers) {
			// var userSubscribed = contains(doc.Subscribers, userId);
			var userSubscribed = false;
			for (var i = 0; i < doc.Subscribers.length && userSubscribed === false; i++) {
				// console.log(doc.Subscribers[i].UserID + "    " + doc.Subscribers[i].Number);
				// console.log(userId + "   " + usingNumber);
				if (doc.Subscribers[i].UserID == userId && doc.Subscribers[i].Number == usingNumber) {
					console.log("TRUUUUE!");
					userSubscribed = true;
				}
			}

			if (!userSubscribed) {
				// console.log(userSubscribed);
				var subs = doc.Subscribers;
				subs.push({UserID: userId, Number: usingNumber});
				dbLogs.merge(number, {
					Subscribers: subs,
				}, function (error, document) {
					if (error) console.log(error);
					console.log("merged.");
				});
			}
		}
		else {
			var s = { Subscribers : [] };
			s.Subscribers.push({UserID: userId, Number: usingNumber});
			// s.SubscribedNumbers.push(usingNumber);

			dbLogs.save(number, s, function (err, doc) {
					console.log("saved.");
			});
		}
	});
};

UserAccount.prototype.getCredits = function (onSuccess, onFailure) {
	UserAccount.getCredits(this._userId, onSuccess, onFailure);
};

UserAccount.getCredits = function(userId, onSuccess, onFailure) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	console.log("UserAccount.getCredits: " + userId);
	dbUsers.get(userId, function (err, doc) {
		if (!err) {
			if (doc.remaining) {
				var remaining = doc.remaining;
				onSuccess({remaining: (remaining-1), message: "You have " + (remaining-1) + " credits remaining."});
			}
			else {
				onFailure({remaining: 0, error: true, message: "You have 0 credits remaining."});
			}
		}
		else {
			onFailure({error: true, message: "No user found."})
		}
	});
};

UserAccount.addCredits = function(userId, amount, onSuccess, onFailure) {
	// userId = escape(userId);
	userId = userId.replace("/", ".slash.");
	console.log("UserAccount.addCredits: " + userId);
	dbUsers.get(userId, function (err, doc) {
		if (!err) {
			if (doc.remaining) {
				var remaining = doc.remaining + amount;
				dbUsers.merge(userId, {
						remaining: remaining
					}, function (err, res) {
				    // Handle response
				});
				onSuccess({remaining: remaining, message: "You have " + remaining + " credits remaining."});
			}
			else {
				onFailure({remaining: 0, error: true, message: "You have 0 credits remaining."});
			}
		}
		else {
			onFailure({error: true, message: "No user found."})
		}
	});
};

exports.UserAccount = UserAccount;