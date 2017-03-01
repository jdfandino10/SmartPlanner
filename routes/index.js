var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient,
assert = require('assert');
var ObjectId = require('mongodb').ObjectId; 

var url = 'mongodb://server:serverPass1@ds163718.mlab.com:63718/smart_planner';

/* GET home page. */
router.get('/', function(req, res, next) {
	res.sendfile('index.html');
});

router.get('/users', function (req, res) {
	getUser(function (users) {
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(users));
	});
});

router.post('/hmk', function (req, res) {
	var id = req.body.userId;
	var hmk = req.body.hmk;
	console.log("id: "+id);
	console.log("hmk: "+hmk);
	addHmkToUser(id, hmk, function(obj){
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(obj));
	});
});

function getUser(callback) {
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);

		var tweetsCol = db.collection("Users");
		tweetsCol.find({'user_name':'default'}).toArray(function(err, data){
			assert.equal(null, err);
			callback(data);
		});
	});
}

function addHmkToUser(id, hmk, callback) {
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);

		var tweetsCol = db.collection("Users");
		tweetsCol.update({'_id': ObjectId(id)}, {$push: {'hmk':hmk}}, {}, function(err, object){
			assert.equal(null, err);

			callback(object);
		});
	});
}

module.exports = router;
