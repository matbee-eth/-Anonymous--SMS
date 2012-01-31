/*
	Application control
*/
var Application = function(appId) {
	this._appId = appId;
};

Application.prototype.check = function() {
	Application.isValidApplication(this._appId, {
		onSuccess: this._successCallback,
		onFailure: this._failureCallback
	});
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
			functions.onFailure({valid: false, fatal: true, message: "Please install valid application."});
		}
		else {
			if (doc.valid === true) {
				functions.onSuccess({valid: true, updateNeeded: false});
			}

			else {
				functions.onFailure({valid: false, fatal: false, updateNeeded: true, message: "Please install valid application."});
			}
		}
	});
};
