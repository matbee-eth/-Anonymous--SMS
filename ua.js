/*
 User Account
*/
var initialAmount = {
	trial: 10,
	purchase: 100
};

var UserAccount = function(userId, functions, amount) {
	if (this === window) {
		return new UserAccount(userId);
	}
	// userId && this._userId = userId;
	if (amount) {
		this._initialAmount = amount;
	}
	else {
		amount = 10;
	}
	if (userId) {
		this._userId = userId;
		this.setUser(this._userId, {
			userExists: function() {
				this._currentUser = this.getUser(functions.onUserExists);
			},
			notFound: function() {
				this.addUser(amount, functions.onUserCreated);
			}
		});
	}
};

UserAccount.prototype.getUser = function() {
	return UserAccount.getUser(this._userId);
};

UserAccount.prototype.addUser = function(amount) {
	UserAccount.addUser(this._userId, amount).on('complete', function(data) {
		this.onUserCreated();
	});
};

UserAccount.prototype.setUser = function(userId, functions) {
	this._userId = userId;
	if (UserAccount.userExists(this._userId) === false) { /* user doesn't exist. */
		functions.notFound && functions.notFound();
	}
	else { /* User exists. */
		functions.userExists && functions.userExists();
	}
};

UserAccount.prototype.onUserLoaded = function (callback) {
	this._onUserLoaded = callback;
};

UserAccount.prototype.onUserCreated = function (callback) {
	this._onUserCreated = callback;
};

UserAccount.addUser = function(userId, amount) {
	return dbUsers.save(userId, {
	    remaining: amount,
	    history: []
	}, function(err, res) {
		if (err) {
			//error.
			 emit('error', err);
		}
		else {
			console.log("added user: " + userId);
			emit('complete', res);
		}
	});
};

UserAccount.getUser = function(userId, functions) {
	
};

UserAccount.userExists = function(userId, functions) {
	
};

UserAccount.sendMessage = function(userId, number, message) {

};

UserAccount.hasCredits = function(userId, functions) {

};