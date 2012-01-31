/* 
 	AnonySMS: Mathieu Gosbee
*/
var fs = require('fs');
var sys = require('sys');
var express = require('express');
var app = express.createServer();
// var io = require('socket.io').listen(app);
var cradle = require('cradle'); 
var email = require('mailer');
var tropo = require('tropo-webapi');
var tropoSession = require('./node_modules/tropo-webapi/lib/tropo-session.js');
var http = require('http');
var url = require('url');
var hashlib = require("hashlib");
var nexmo = require('./node_modules/nexmo/nexmo.js');
nexmo.initialize("b650b741","1fb154e1","http");

var authToken;
var C2DM = require('c2dm').C2DM;
var config = {
    user: 'invisisms@gmail.com',
    password: 'Invisisms1',
    source: '0.1',
    keepAlive: true
};
var c2dm = new C2DM(config);
c2dm.login(function(err, token){
    // err - error, received from Google ClientLogin api
    // token - Auth token
    console.log("AUTH TOKEN: " + token);
    if (!err) authToken = token;
});

var conn = new(cradle.Connection)('......cloudant.com', 5984, {
	auth: { username: '.....', password: '.....' },
    cache: false,
    raw: false
});

// var NumberClass = require('./number.js').NumberClass;
var SMSCenter = require('./central.js').SMSCenter;
var UserAccount = require('./user.js').UserAccount;
var Application = require('./application.js').Application;

var dbUsers = conn.database('anonysms_users');
var dbLogs = conn.database('anonysms_inbound');
var dbNumbers = conn.database('anonysms_numbers');
var dbGuids = conn.database('anonysms_guids');

/*
 User Account Control.
*/
var initialAmount = {
	trial: 10,
	purchase: 100
};

/*
 Main.
*/
// var numbers = ["5184000578", "7146841845", "5853260860", "2898000527", "6479314607", "5853260808","4436372132", "5125185853", "3314316362", "3523537858", "7344189757"];


var center = new SMSCenter();
// for (var numCount = 0; numCount < numbers.length; numCount++) {
	// center.addNumber(numbers[numCount]);
// }
// center.getNumbers();
(function () {
	dbNumbers.all(function (err, doc) {
		for (var i = 0; i < doc.length; i++) {
			var currentItem = doc[i];
			console.log(currentItem.id);
			center.addNumber(currentItem.id, currentItem.type);
		}
	});

	dbNumbers.save('_design/country', {
		views: {
			all: {
				map: function (doc) { if (doc.country) { emit(doc.country, doc); } },
			}
		}
	});

	dbUsers.save('_design/numberByCountry', {
		views: {
			all: {
				map: function (doc) {
					
				}
			}
		}
	});

	dbLogs.save('_design/subscribers', {
		views: {
			all: {
				map: function (doc) {
					// emit(doc, doc);
					// emit("hello", "world");
					// emit("hello", "world");
					// emit("hello", "world");
					for (var i = 0; i < doc.Subscribers.length; i++) {
						if (doc.Subscribers[i].Number)
						emit([doc.Subscribers[i].Number, doc._id], doc.Subscribers[i]);
						else {
							emit(doc._id, doc);
						}
					}
				}
			}
		}
	});
	var now = new Date();
	var utc = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

	// nexmo.sendTextMessage("12898467040","12892595865","Service started. " + utc, function (err, response) {
	// 	console.log(response);
	// });
})();

var queue = [];

app.configure(function(){
	app.use(express.methodOverride());
   	app.use(express.bodyParser());
    app.use(express.cookieParser());
});

/*
*
* Websocket server
*/
var connectedClients = [];
// app.get('/', function (req, res) {
// 	var guid = req.query.guid;
// 	// guid = escape(guid);
// 	guid = guid.replace("/", ".slash.");
// 	var user = new UserAccount(conn, guid, function (response) {
// 			res.sendfile(__dirname + '/index.html');
// 		},
// 		function (err) {
// 			res.sendfile(__dirname + '/instructions.html');
// 	});
// });
// io.sockets.on('connection', function (socket) {
// 	socket.on('set guid', function (guid) {
// 		socket.set('guid', guid, function () {
// 			guid = guid.replace("/", ".slash.");
// 			connectedClients[guid] = socket;
// 			console.log(guid + " has been set.");
// 		});
// 	});
// 	socket.on('disconnect', function () {
// 		socket.get('guid', function (err, guid) {
// 			if (!err)
// 				connectedClients[guid] = null;
// 		})
// 	});
// });

/*
*
* End of Websocket server
*/
app.post('/send', function(req, res){
	res.contentType('application/json');
	var message = req.params.message;
	var number = trim(req.params.number);
	var guid = req.params.guid;
	var key = req.params.key;
	if (number.length === 10) {
		number = "1"+number;
	}
	number = number.replace(/[\(\)-]/g, '');

	console.log("Number: " + number);
	sendMessage(res, guid, number, key, message);

});


app.get('/send', function(req, res){
	res.contentType('application/json');
	// console.log(req.query);
	var message = req.query.message; 
	var number = trim(req.query.number);
	if (number.length === 10) {
		number = "1"+number;
		// console.log("Number Length: " + number.length);
	}
	number = number.replace(/[\(\)-]/g, '');
	// console.log("Number: " + number);

	var guid = req.query.guid;
	var key = req.query.key;

	if (req.query.using) {
		var using = req.query.using;
		if (using.length === 10) {
			using = "1"+using;
			// console.log("Number Length: " + number.length);
		}
		sendMessage(res, guid, number, key, message, using);
	}
	else if (req.query.country) {
		// sendMessageUsingCountry(res, guid, number, key, message, country);
	}
	else {
		sendMessage(res, guid, number, key, message);
	}
});

app.post('/messageStatus/:guid', function (req, res) {
	/*
	* This is when the credit should be removed from the guid.
	*/
	res.contentType('application/json');
	// console.log("messageStatus: " + req.params.guid);
	console.log("MESSAGE STATUS " + req.params.guid);
	console.log(req.body.deliveryInfoNotification.deliveryInfo);
	if (req.body.deliveryInfoNotification.deliveryInfo)
	{
		var userId = req.params.guid;
		guid = guid.replace("/", ".slash.");
		var user = new UserAccount(conn, userId, function (doc) {
			user.removeCredits(1);
			console.log("REMOVED USERS CREDITS");
		}, function (doc) {
			
		});
	}
	
	res.send({});
});

app.get('/messageStatus/:guid', function (req, res) {
	// console.log(req.params.guid);
	res.contentType('application/json');
	console.log("MESSAGESTATUS: " + req.params.guid);
	res.send({});
});

var sendMessage = function(res, guid, number, hashGuid, message, using) {
	/*
		restructure.
	*/
	// Application is valid.
	
	var user;
	var username = guid;


	var failure = function (msg) {
		console.log("FAILURE MSG:");
		console.log(msg);
		console.log("EOF");
		res.send(msg);
	};

	var usrsuccess = function (msg) {
		console.log("usrsuccess");
		var messageSent = function (response) {
			console.log("messageSent");
			user.getCredits(function(eee) {
				res.send(eee);
			}, function (err) {
				res.send(err);
			})
		};

		var messageFailed = function (response) {
			console.log("messageFailed");
			res.send(response);
		};
		var remaining = msg.doc.remaining;
		if (remaining > 0) { // User has credits remaining.
			var numberUsed = user.sendMessage(center, message, number, messageSent, messageFailed, using);
			console.log("NUMBER USED: " + numberUsed);
		}
		else {
			res.send({remaining: remaining, message: "You must purchase more credits."});
		}
	};

	var usrfailure = function (msg) {
		// User doesn't exist. Create account...?
		res.send(msg); 
	};

	var success = function (msg) {
		var amt = 10;
		var asff = asff;
		var fail = function(doc) {
			res.send({error: true, description: "User does not exist."});
			console.log("User does not exist.");
		}
		guid = guid.replace("/", ".slash.");
		user = new UserAccount(conn, guid, usrsuccess, fail);
	};

	if (!guid || !message || !number || !hashGuid) {
		console.log("Invalid application, missing parameters. " + guid + message + number + hashGuid);
		res.send({message: "Please install valid application."});
	}
	else {
		var application = new Application(guid, hashGuid, conn);
		application.onSuccess(success).onFailure(failure).check();
	}
}

app.get('/payment/fortumo', function (req, res) {
	res.contentType('application/json');
	res.send({value: 'OK'});
	// console.log(req.query);
	if (req.query.status == "OK") {
		var guid = req.query.user_id;
		var credits = req.query.credit_amount;
		guid = guid.replace("/", ".slash.");
		var user = new UserAccount(conn, guid, function (response) {
				user.addCredits(credits);
			},
			function (err) {
				console.log(err);
		});
	}
});

app.get('/getNumber/:country', function (req, res) {
	res.contentType('application/json');
	var country = req.params.country;
	dbNumbers.view('country/all', {key: country}, function (err, doc) {
		res.send(doc);
	});
});

app.get('/getNumber', function (req, res) {
	res.contentType('application/json');
	dbNumbers.view('country/all', function (doc) {
		res.send(doc);
	})
});


app.get('/getNumber/:country/:phoneNumber', function (req, res) {
	res.contentType('application/json');
	console.log("Retrieving available OUTBOUND" +  req.params.country +" number for " + req.params.phoneNumber);
	var phoneNumber = req.params.phoneNumber;
	var country = req.params.country;
	var guid = req.query.guid;
	var key = req.query.key;
	// guid = guid.replace("/", ".slash.");

	// Step one: Find out if guid is already subscribed.
	// Step two: If subscribed, return subscribed server number.
	// Step three: If not, search database for viable number.
	var application = new Application(guid, key, conn);
	application.onSuccess(function (doc) {
		guid = guid.replace("/", ".slash.");
		var user = new UserAccount(conn, guid, function (response) {
			application.getSubscribedUsers(dbLogs, phoneNumber, function (success) {
				// res.send(success);
				// console.log(success);
				var finalNumbers = [];
				
				for (var i = 0; i < success.length; i++) {
					if (success[i].UserID == guid) {
						finalNumbers.push(success[i].Number.toString());
					}
				}
				// console.log(finalNumbers);
				dbNumbers.get(finalNumbers, function (err, numdoc) {
					if (!err) {
						// res.send(numdoc);
						var pass = false;
						console.log(numdoc);
						for (var i = 0; i < numdoc.length; i++) {
							// console.log(numdoc[i]);
							if (numdoc[i].doc.country == country) {
								res.send([numdoc[i].id]);
								pass = true;
								i = numdoc.length;
							}
						}
						if (!pass) {
							// res.send(pass);
							dbNumbers.view('country/all', {key: country}, function (err, possibleNumbers) {
								if (err) {
									res.send(err);
								}
								else {
									// res.send(doc);
									var completed = 0;
									var completo = [];
									var availableNumbers = [];
									var nums = [];
									for (var i = 0; i < possibleNumbers.length; i++) {
										var number = possibleNumbers[i].id;
										if (possibleNumbers[i].id != "_design/country")
										nums.push(number);
									}
									if (nums.length > 0) {
										dbLogs.get(phoneNumber, function (err2, doc2) {
											var availableNumbers = [];
											for (var i = 0; i < doc2.Subscribers.length; i++) {
												var cur = doc2.Subscribers[i];
												console.log(cur);

												for (var c = nums.length; c >= 0; c--) {
													var serverNumber = nums[c];
													if (serverNumber == cur.Number) {
														// availableNumbers.push(nums[c]);
														// delete nums[c];
														nums.splice(c,1);
													}
												}
											}
											res.send(nums);
										});
									}
								}
							});
						}
					}
					else {
						res.send({error: true, doc: err});
					}
				});
			}, function (failure) {
				// res.send(failure);
				dbNumbers.view('country/all', {key: country}, function (err, possibleNumbers) {
					// res.send(possibleNumbers);
					var list = [];
					for (var i = 0; i < possibleNumbers.length; i++) {
						list.push(possibleNumbers[i].id);
					}
					res.send(list);
				});
			});
		},
		function (err) {
			res.send(err);
		});
	}).onFailure(function (err) {
		res.send(err);
	}).check();
});

app.get('/history', function (req, res) {
	res.contentType('application/json');
	console.log("Retrieving history for user.");
	var guid = req.query.guid;
	var key = req.query.key;

	if (!key || !guid || key == null || guid == null) {
		res.send({error: true});
	}
	else {
		var application = new Application(guid, key, conn);
		application.onSuccess(function (doc) {
			guid = guid.replace("/", ".slash.");
			var user = new UserAccount(conn, guid, function (response) {
				user.getHistory(function (r) {
					res.send(r);
				}, function (e) {
					res.send(e);
				})
			},
			function (err) {
				res.send(err);
			})
		}).onFailure(function (err) {
			res.send(err);
		}).check();
	}
});

app.get('/newMessages', function (req, res) {
	res.contentType('application/json');
	var guid = req.query.guid;
	var key = req.query.key;
	var ip_address = null;
    try {
            ip_address = req.headers['x-forwarded-for'];
    }
    catch ( error ) {
            ip_address = req.connection.remoteAddress;
    }
    // sys.puts( ip_address );

	console.log("Checking for new messages. IP ADDRESS: " + ip_address + " : key: " + key + " guid: " + guid);

	if (!key || !guid || key == null || guid == null) {
		res.send({error: true});
	}
	else {
		//var user = new UserAccount(guid, amt, usrsuccess, fail);
		// var user;
		var application = new Application(guid, key, conn);
		application.onSuccess(function (doc) {
			guid = guid.replace("/", ".slash.");
			var user = new UserAccount(conn, guid, function (response) {
				var max_intervals = 6;
				var count = 0;
				
				console.log("check");
				var checker = function() {
					console.log("CHEKCING!!");
					count++;
					if (count >= max_intervals) {
						// clearInterval(interval);
						res.send([]);
						console.log("CLEARING INTERVAL.");
					}
					else {
						console.log(typeof user);
						user.getNewMessages(function (messages) {
							if (messages.messages.length > 0) {
								user.removeNewMessages(messages.messages, function (responseDoc) {
									// clearInterval(interval);
									res.send(messages.messages);
									console.log("CLEARING INTERVAL.");
								}, function (responseDoc) {
									// do nothing :)
									console.log("There was an error: " + JSON.stringify(responseDoc));
									// clearInterval(interval);
									res.send(responseDoc);
								});
							}
							else {
								setTimeout(checker, 5000);
								console.log(count);
							}
						}
					)};
					}
					

				checker();

			 },

				function (err) {
					res.send(err);
				});
		}).onFailure(function (doc) {
			res.send({error: true});
		}).check();
	}
});

app.get('/getValidApplicationList', function (req, res) {
	Application.getValidApplicationList(function(doc) { res.send(doc); }, function (doc) { res.send(doc); });
});

app.get('/numbers', function (req, res) {
	var guid = req.query.guid;
	var key = req.query.key;
	var application = new Application(guid, key, conn);
	application.onSuccess(function (doc) {
		guid = guid.replace("/", ".slash.");
		var user = new UserAccount(conn, guid, function (response) {
			var output = [];
			dbNumbers.all(function (err, doc) {
				var last = doc[doc.length-1].id;
				var list = [];
				for (var i = 0; i < doc.length; i++) {
					// list.push(doc[i].id);
					list.push(doc[i].id);
				}

				dbNumbers.get(list, function (error, document) {
					// res.send(document);
					var outtie = [];
					for (var k = 0; k < document.length; k++) {
						var currentItem  = document[k];
						outtie.push({number: currentItem.id, country: currentItem.doc.country, stateprovince: currentItem.doc.stateprovince})
					}
					res.send(outtie);
				});
			});
		}, function (errResponse) {
			res.send(errResponse)
		});
	});
	application.onFailure(function(err) {
		res.send(err);
	});
	application.check();
});

app.get('/addNumber', function (req, res) {
	res.contentType('application/json');

});

app.get('/android', function (req, res) {
	res.contentType('application/json');
	console.log("ANDROID REGISTRATION: " + registrationId);
	var key = req.query.key;
	var guid = req.query.guid;
	var registrationId = req.query.registrationId;
	
	var application = new Application(guid, key, conn);
	application.onSuccess(function (doc) {
		guid = guid.replace("/", ".slash.");
		user = new UserAccount(conn, guid, function (response) {
			// guid = escape(guid);
			// guid = guid.replace("/", ".slash.");
			dbUsers.get(guid, function (err, document) {
			    if (err) {
			    	res.send({error: "User doesn't exist."});
			    	console.log("err: " + guid);
			    }
			    else {
			    	if (document.remaining === undefined) {
						res.send({error: "User doesn't exist."});
						console.log("document.remaining: " + guid);
						console.log(document);
			    	}
			    	else {
				    	// onSuccess({exists: true, doc: doc});
				    	dbUsers.merge(guid, {
				    			androidPhoneRegistrationId: registrationId
							}, function (err, res) {
						    // Handle response
						});
						res.send({androidPhoneRegistrationId: registrationId, message: "User has set their Android Phone PUSH Device ID."});
						// sendEmail(email, "Welcome to AnonySMS!", "Thank you for registering your email address with us. When someone replies to one of your AnonySMS text's you will automatically be notified by email!");
						console.log("USER REGISTRATION ID: " + registrationId);
			    	}
				}
			});
		}, function (response) {
			res.send(response);
		});
	}).onFailure(function (doc) {
		res.send({error: true});
	}).check();
});

app.get('/windowsPhoneUri', function (req, res) {
	var key = req.query.key;
	var guid = req.query.guid;
	var uri = req.query.uri;
	res.contentType('application/json');
	var application = new Application(guid, key, conn);
	application.onSuccess(function (doc) {
		guid = guid.replace("/", ".slash.");
		user = new UserAccount(conn, guid, function (response) {
			// guid = escape(guid);
			// guid = guid.replace("/", ".slash.");
			dbUsers.get(guid, function (err, document) {
			    if (err) {
			    	res.send({error: "User doesn't exist."});
			    	console.log("err: " + guid);
			    }
			    else {
			    	if (document.remaining === undefined) {
						res.send({error: "User doesn't exist."});
						console.log("document.remaining: " + guid);
						console.log(document);
			    	}
			    	else {
				    	// onSuccess({exists: true, doc: doc});
				    	dbUsers.merge(guid, {
				    			windowsPhoneUri: uri
							}, function (err, res) {
						    // Handle response
						});
						res.send({WindowsPhoneUri: uri, message: "User has set their Windows Phone PUSH Uri."});
						// sendEmail(email, "Welcome to AnonySMS!", "Thank you for registering your email address with us. When someone replies to one of your AnonySMS text's you will automatically be notified by email!");
						console.log(uri);
						console.log("set user " + guid + " uri: " + uri)
			    	}
				}
			});
		}, function (response) {
			res.send(response);
		});
	}).onFailure(function (doc) {
		res.send({error: true});
	}).check();
});

app.get('/register', function (req, res) {
	console.log(req.query);
	var key = req.query.key;
	var email = req.query.email
	var guid = req.query.guid;
	var phoneNumber = req.query.number;

	var application = new Application(guid, key, conn);
	application.onSuccess(function (doc) {
		guid = guid.replace("/", ".slash.");
		user = new UserAccount(conn, guid, function (userExistsResponse) {
			res.send({error: true, description: "User is already registered."});
		}, function (doesntExistResponse) {
			user.addUser(10, function (onSuccess) {
				res.send(onSuccess);
			}, function (onFailure) {
				res.send(onFailure);
			});
		});
	});
	application.onFailure(function (doc) {
		res.send(doc);
	});
	application.check();
});

app.get('/set', function (req, res) {
	console.log(req.query);
	var key = req.query.key;
	var email = req.query.email
	var guid = req.query.guid;
	var phoneNumber = req.query.number;

	var application = new Application(guid, key, conn);
	application.onSuccess(function (doc) {
		guid = guid.replace("/", ".slash.");
		user = new UserAccount(conn, guid, function (response) {
			// guid = escape(guid);
			guid = guid.replace("/", ".slash.");
			dbUsers.get(guid, function (err, document) {
			    if (err) {
			    	res.send({error: "User doesn't exist."});
			    	console.log("err: " + guid);
			    }
			    else {
			    	if (document.remaining === undefined) {
						res.send({error: "User doesn't exist."});
						console.log("document.remaining: " + guid);
						console.log(document);
			    	}
			    	else {
				    	// onSuccess({exists: true, doc: doc});
				    	dbUsers.merge(guid, {
				    			email: email,
				    			phoneNumber: phoneNumber
							}, function (err, res) {
						    // Handle response
						});
						var ressend = {};
						if (email) {
							ressend.email = email;
							ressend.message = "User has set their email address.";
						}
						if (phoneNumber) {
							ressend.phoneNumber = phoneNumber;
							ressend.phoneMessage = "User has set their phone number."
						}
						res.send(ressend);
						sendEmail(email, "Welcome to AnonySMS!", "Thank you for registering your email address with us. When someone replies to one of your AnonySMS text's you will automatically be notified by email! Please ACTIVATE your email by going to this link: <a href=\"http://mytextmessages.nodester.com/validate?guid=" + guid +"&key=" + key + "\">http://mytextmessages.nodester.com/validate?guid=" + guid +"&key=" + key +"</a>");
						console.log(guid);
			    	}
				}
			});
		}, function (response) {
			res.send(response);
		});
	}).onFailure(function (doc) {
		res.send({error: true});
	}).check();
});

app.get('/validate', function (req, res) {
	res.send("Account verified. Thank you!");
});

app.get('/inbound', function (req, res) {
	console.log(req.query);
	res.contentType('application/json');
	res.send({value: "OK"});
	var callerID = req.query.msisdn;
	var serverNumber = req.query.to;
	var message = req.query.text;

	notifySubscribedNumbers(callerID, message, serverNumber);

		dbLogs.get(callerID, function (err, doc) {
			if (!err) {
				var subscribers = doc.Subscribers;
				console.log(subscribers);
				for (var i = 0; i < subscribers.length; i++) {
					var subscriber = subscribers[i];
					console.log(subscriber.Number + "    "  + serverNumber);
					if (subscriber.Number == serverNumber) {
						dbUsers.get(subscriber.UserID, function (error, userDoc) {
							if (error) {
								// res.send({error: true, message: "User not found."});
							}
							if (userDoc.remaining === undefined || userDoc.email === undefined) {
								// res.send(error: true, message: "User not found.");
							}
							else {
								// Send email to user.
								userDoc.email && sendEmail(userDoc.email, "Message received from: " + callerID, callerID + " has sent you a text message via AnonySMS: " + message);
							}
						});
						console.log("subscribers to: " + callerID + " : " + subscribers[i].UserID);
					}
				}
			}
		});
});

app.post('/inbound', function(req, res) {
	console.log(req.body);
	res.contentType('application/json');
	var callerID = null;
	var message = null;
	var intendedNumber = null;
	var create = false;

	if (req.body.session) {
		var info = req.body.session;
		if (info.parameters && info.parameters.action && info.parameters.action == "create") {
			create = true;
			var webapi = new tropo.TropoWebAPI();
			console.log('INBOUND TROPO MESSAGE: ');
			var sss = {value: info.parameters.msg}
			webapi.message(sss, info.parameters.number, false, "TEXT", info.parameters.usingNumber);
			res.send(TropoJSON(webapi));
		}
		else {
			callerID = info.from.id;
			message = info.initialText;
			intendedNumber = info.to.id;
			reply_id = callerID;
		}
		
	}
	else {
		callerID = req.body['inboundSMSMessageNotification']['inboundSMSMessage']['senderAddress'];
		message = req.body['inboundSMSMessageNotification']['inboundSMSMessage']['message'];
		intendedNumber = req.body['inboundSMSMessageNotification']['inboundSMSMessage']['destinationAddress'];
		intendedNumber = intendedNumber.substr(6);
		reply_id = callerID.substr(5);
	}

	if (!create) {
		var complete_msg = "Caller: " + reply_id + " -- Msg: " + message;
		console.log(complete_msg);
		notifySubscribedNumbers(reply_id, message, intendedNumber);

		dbLogs.get(reply_id, function (err, doc) {
			if (!err) {
				var subscribers = doc.Subscribers;
				console.log(subscribers);
				for (var i = 0; i < subscribers.length; i++) {
					var subscriber = subscribers[i];
					console.log(subscriber.Number + "    "  + intendedNumber);
					if (subscriber.Number == intendedNumber) {
						dbUsers.get(subscriber.UserID, function (error, userDoc) {
							if (error) {
								// res.send({error: true, message: "User not found."});
							}
							if (userDoc.remaining === undefined || userDoc.email === undefined) {
								// res.send(error: true, message: "User not found.");
							}
							else {
								// Send email to user.
								userDoc.email && sendEmail(userDoc.email, "Message received from: " + reply_id, reply_id + " has sent you a text message via AnonySMS: " + message);
							}
						});
						console.log("subscribers to: " + reply_id + " : " + subscribers[i].UserID);
					}
				}
			}
		});
		res.end();
	}
});

app.get('/email', function (req, res) {
	sendEmail("mail@matbee.com", "testing", "this is a test");
});

app.get('/test', function (req, res) {
	var guid = req.query.guid;
	console.log("hashlib: " + hashlib.hmac_sha1("guid", "3beabd08-81cb-4731-8a48-93480a863f3f"));
	console.log("hashlib: " + hashlib.hmac_sha1(escape(guid), "3beabd08-81cb-4731-8a48-93480a863f3f"));
	// console.log("crypto: " + crypto.createHmac('sha1', "3beabd08-81cb-4731-8a48-93480a863f3f").update(guid).digest('hex'));
	Application.verifyGuid(guid, hashlib.hmac_sha1(guid, "3beabd08-81cb-4731-8a48-93480a863f3f"), function (doc) { res.send({guid: guid, hash: hashlib.hmac_sha1(guid, "3beabd08-81cb-4731-8a48-93480a863f3f"),doc: doc}); }, function (doc) { res.send(doc)});
});

var sendEmail = function (emailTo, topic, message) {
	email.send({
	  	host: "smtp.gmail.com",
	  	port : "25",
	  	domain: "smtp.gmail.com",
	  	authentication: "login",
	  	username: ".....",
	  	password: ".....",
	  	to : emailTo,
	  	from : ".....",
	  	subject : topic,
	  	body : message
	});
};

app.listen(12668);

var trim = function(str) {
	str = str.replace(/^\s+/, '');
	for (var i = str.length - 1; i >= 0; i--) {
		if (/\S/.test(str.charAt(i))) {
			str = str.substring(0, i + 1);
			break;
		}
	}
	return str;
}

var shuffle = function(o){ //v1.0
	
	return o;
};



var notifySubscribedNumbers = function(number, message, inboundNumber) {
	console.log("Number: " + number);
	console.log("Message: " + message);
	console.log("inboundNumber: " + inboundNumber);

	(function(number, message, inboundNumber) {
		dbLogs.get(number, function (err, doc) {
			if (!err) {
				var subscribers = doc.Subscribers;

				for (var i = 0; i < subscribers.length; i++) {
					// console.log(subscribers[i]);
					var subscriber = subscribers[i];

					if (subscriber.Number == inboundNumber) {
						if (connectedClients[subscriber.UserID] != null && connectedClients[subscriber.UserID] != undefined) 
						{
							console.log("socket: "+guid);
							connectedClients[guid].emit('textmessage', {number: number, message: message, inboundNumber: inboundNumber} );
						}
						dbUsers.get(subscriber.UserID, function (err2, doc2) {
							if (!err) {
								if (inboundNumber.length <= 10) {
									inboundNumber = "1" + inboundNumber;
								}
								console.log("Number: " + number);
								console.log("Message: " + message);
								console.log("inboundNumber: " + inboundNumber);
								var now = new Date();
								var utc = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

								var messages = doc2.newMessages;
								messages.push({message: message, number: number, inboundNumber: inboundNumber, date: utc});

								var history = doc2.history;
								history.push({number: number, message: message, type: "incoming", date: utc, inboundNumber: inboundNumber});

								console.log(doc2._id);
								dbUsers.merge(doc2._id, {newMessages: messages, history: history}, function (err3, doc3) {
									// console.log("notifySubscribedNumbers: subscriber = " + doc2._id + " number = " + number);
									// console.log("Message" + message);
									// console.log("Number" + number);
								} );
								if (doc2.windowsPhoneUri) {
									//var rawMessage = JSON.stringify({message: message, number: number, inboundNumber: inboundNumber, date: utc});
									// var rawMessage = "X-WindowsPhone-Target: toast\r\n\r\n" +
									var rawMessage = "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
										"<wp:Notification xmlns:wp=\"WPNotification\">" +
											"<wp:Toast>" +
												"<wp:Text1>" + number + "</wp:Text1>" +
												"<wp:Text2>" + message + "</wp:Text2>" +
												"<wp:Param>/UserMessages.xaml?number=" + number + "&amp;appNumber=" + inboundNumber +"</wp:Param>" +
											"</wp:Toast>" +
										"</wp:Notification>";
									// rawMessage = encodeURIComponent(rawMessage);
									console.log(rawMessage);
									var siteUrl = url.parse(doc2.windowsPhoneUri);
									var site = http.createClient(80, siteUrl.host);
									var request = site.request("POST", siteUrl.pathname, {'host' : siteUrl.host, 'Content-Type': 'text/xml', 'Content-Length': rawMessage.length, "X-NotificationClass": "2", "X-WindowsPhone-Target": "toast"});
									console.log("Number: " + number);
									console.log("Message: " + message);
									console.log("inboundNumber: " + inboundNumber);

									request.write(rawMessage);
									request.end();
									request.on('response', function(response) {
					                    response.setEncoding('utf8');
					                    console.log('STATUS: ' + response.statusCode);
					                    console.log(JSON.stringify(response.headers));
					                    response.on('data', function(chunk) {
					                            // console.log("DATA: " + chunk);
					                    });
						            });
								}
								if (doc2.androidPhoneRegistrationId) {
									var androidmessage = {
									    registration_id: doc2.androidPhoneRegistrationId,
									    collapse_key: number,
									    'data.message': message,
									    'data.number': number,
									    'data.inboundNumber': inboundNumber,
									    'data.date': utc
									};

									c2dm.send(androidmessage, function(err, messageId){
										console.log("ANDROID MESSAGE: " + messageId);
									});
								}
							}
						});
					}
				}
			}
			
		})	
	})(number,message,inboundNumber)

	
}


var contains = function (a, obj) {
  var i = a.length;
  while (i--) {
    if (a[i] === obj) {
      return true;
    }
  }
  return false;
}

