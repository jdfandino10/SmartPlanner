var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient,
	assert = require('assert');

var url = 'mongodb://server:serverPass1@ds163718.mlab.com:63718/smart_planner';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendfile('index.html');
});

router.get('/users', function (req, res) {
  console.log("llego al get de users");
  getUser(function (users) {
  	console.log(users);
  	res.setHeader('Content-Type', 'application/json');
  	res.send(JSON.stringify(users));
  });
});

function getUser(callback) {
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);

		var tweetsCol = db.collection("Users");
		tweetsCol.find({'user_name':'default'}).toArray(function(err, data){
			assert.equal(null, err);
			console.log("got data?");
			callback(data);
		});
	});
}

module.exports = router;
