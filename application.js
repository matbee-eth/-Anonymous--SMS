var hashlib = require("hashlib");

/*
 Application Info
*/
var dbUsers;
var dbGuids;

var Application = function(userGuid, hashGuid, conn) {
	this._appId = userGuid;
	this._hashGuid = hashGuid;
	dbGuids = conn.database('anonysms_guids');
	dbUsers = conn.database('anonysms_users');
};

Application.prototype.check = function() {
	Application.verifyGuid(this._appId, this._hashGuid, this._successCallback, this._failureCallback);

	// Application.isValidApplication(this._appId, this._hashGuid, {
	// 	onSuccess: this._successCallback,
	// 	onFailure: this._failureCallback
	// });
	return this;
};

Application.prototype.onSuccess = function(callback) {
	this._successCallback = callback;
	return this;
};

Application.prototype.onFailure = function(callback) {
	this._failureCallback = callback;
	return this;
};

Application.isValidApplication = function(appId, functions) {
	dbGuids.get(appId, function(err, doc) {
		if (err) {
			console.log(JSON.stringify(err));
			functions.onFailure({valid: false, fatal: true, message: "This Application ID doesn't exist."});
		}
		else {
			if (doc.valid === true) {
				functions.onSuccess({valid: true, updateNeeded: false});
			}

			else {
				console.log("doc.valid == false");
				functions.onFailure({valid: false, fatal: false, updateNeeded: true, message: "This Application ID is no longer valid.", doc: doc});
			}
		}
	});
};

Application.getValidApplicationList = function (onSuccess, onFailure) {
	dbGuids.all(function(err, doc) {
		if (err) {
			onFailure({message: "didn't find a thing.", error: true});
		}
		else {
			var out = [];
			for (var i = 0; i < doc.length; i++) {
				var key = doc[i].key;
				out[out.length] = key;
			}
			dbGuids.get(out, function(err, thisdoc) {
				if (err) {
					onFailure({valid: false, fatal: true, message: "Application ID doesn't exist."});
				}
				else {
					var list = [];
					for (var i = 0; i < doc.length; i++) {
						if (thisdoc[i].doc.valid === true) {
							list[list.length] = thisdoc[i].key;
						}
					}
					onSuccess(list);
				}
			});
		}
	});
};

Application.prototype.getSubscribedUsers = function (dbLogs, number, onSuccess, onFailure) {
	Application.getSubscribedUsers(dbLogs, number, onSuccess, onFailure);
};

Application.getSubscribedUsers = function (dbLogs, number, onSuccess, onFailure) {
	dbLogs.get(number, function (err, doc) {
		if (!err) {
			// var out = [];
			// var subscribers = doc.Subscribers;
			onSuccess(doc.Subscribers);
		}
		else {
			onFailure({error: true, message: "User not found."});
		}
	});
};

Application.verifyGuid = function (guid, usersHash, onSuccess, onFailure) {
	// var guid = "3beabd08-81cb-4731-8a48-93480a863f3f";
	// var usersHash = "35e0f85f1e13732b6303addfed147c83";
	// console.log("Application.verifyGuid: " + guid + " " + usersHash);
	Application.getValidApplicationList(
		function(doc) {
			var pass = false;
			for (var i = 0; i < doc.length && !pass; i++) {
				var currentHash = hashlib.hmac_sha1(guid, doc[i]);
				// console.log("Application.verifyGuid currentHash: " + currentHash + " vs " + usersHash);
				// var currentHash = crypto.createHmac('sha1', doc[i]).update(guid).digest('hex');
				// console.log("currenthash: " + currentHash);
				if (currentHash.toLowerCase() === usersHash.toLowerCase()) {
					pass = true;
				}
			}
			if (!pass) {
				onFailure({guid: guid, hash: usersHash, valid: false, fatal: false, updateNeeded: true, message: "Invalid.", doc: doc});
			}
			else {
				onSuccess({valid: true, updateNeeded: false});
			}
		 }, 
		 function (doc) {
		 	console.log("failed db connection");
		 	onFailure({valid: false, fatal: true, message: "Database connection failed. Please retry later."});
	});
};

exports.Application = Application;