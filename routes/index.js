var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectId;
var urlParser = require('url');
var moment = require('moment');
const nodemailer = require('nodemailer');

var url = 'mongodb://server:serverPass1@ds163718.mlab.com:63718/smart_planner';

// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'SmartPlannerService@gmail.com',
		pass: 'SPSclave1'
	}
});


/* GET home page. */
router.get('/', function(req, res, next) {
	res.sendfile('index.html');
});

/* GET usuario o all users si user_name no esta definido*/
router.get('/users', function (req, res) {
	var url_parts = urlParser.parse(req.url, true);
	var query = url_parts.query;
	var username = query.username;
	console.log(username);
	getUsers(username, function (users) {
		console.log("Llega al callback");
		console.log(users);
		function done() {
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify(users));
		}
		if(username){
			getOrderedHomeworks(function(data){
				users[0].hmk = data;
				done();
			}, users[0].hmk);
		}else {
			done();
		}
	});
});
// probado: bien!

/* POST de una tarea a un usuario segun su id*/
router.post('/hmk', function (req, res) {
	var id = req.body.userId;
	var hmk = req.body.hmk;
	addHmkToUser(id, hmk, function(obj){
		if(obj.error){
			res.status(404).send("No se puede agregar tareas con el mismo nombre y fecha limite");
		}else{
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify(obj));
		}
	});
});
// probado: bien!


/* DELETE una tarea de un usuario segun su id*/
router.delete('/hmk', function(req, res){
	var id = req.body.userId;
	var hmk = req.body.hmk;
	deleteHmk(id, hmk, function(obj){
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(obj));
	});
});
// probado: bien!

function getUsers(username, callback) {
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);
		var f = {'user_name':username};
		console.log(f);
		if(!username) f={};
		var tweetsCol = db.collection("Users");
		tweetsCol.find(f).toArray(function(err, data){
			assert.equal(null, err);
			callback(data);
		});
	});
}
// probado: bien!

function addHmkToUser(id, hmk, callback) {
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);

		var tweetsCol = db.collection("Users");
		tweetsCol.find({'_id': ObjectId(id), 'hmk': {$elemMatch: {'name': hmk.name, 'limit_date':hmk.limit_date}}}).toArray(function(err, data){
			assert.equal(null, err);
			if(data.length==0){
				tweetsCol.update({'_id': ObjectId(id)}, {$push: {'hmk':hmk}}, {}, function(err, object){
					assert.equal(null, err);

					callback(object);
				});
			}else{
				callback({'error':'Ya existe dicha tarea'});
			}
		});
	});
}
// probado: bien!

function deleteHmk(id, hmk, callback) {
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);

		var tweetsCol = db.collection("Users");
		tweetsCol.update(
			{'_id': ObjectId(id)},
			{$pull:
				{
					'hmk':{'name': hmk.name, 'limit_date':hmk.limit_date}
				}
			},
			{},
			function(err, object){
				assert.equal(null, err);

				callback(object);
			});
	});
}
// probado: bien!

function timeToSaturdayMidDay() {
	
	var ans = moment().day(6).hour(9).valueOf() - new Date().getTime();
	console.log(ans);
	return ans;
}
// probado: bien!

function getSubscribedUsers(callback) {
	console.log("llega a getSubscribedUsers");
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);
		var f = {'subscribed':'true'};
		var tweetsCol = db.collection("Users");
		console.log("va a hacer el query");
		tweetsCol.find(f).toArray(function(err, data){
			assert.equal(null, err);
			callback(data);
		});
	});
}
// probado: falta

function getOrderedHomeworks(callback, hmks, maxDate){
	console.log("llega a getOrderedHomeworks");
	var maxMilis = Infinity;
	var minDate = moment().valueOf();
	if(maxDate){
		var maxDay = moment().add(maxDate, 'days').valueOf();
	}
	var candidates = [];
	hmks.forEach(function(hmk){
		if(hmk.limit_date<=maxMilis && hmk.limit_date>=minDate){
			hmk.score = hmk.limit_date-((1-hmk.done_percentage)*hmk.estimated_time);
			candidates.push(hmk);
		}
	});
	candidates.sort(function(a, b){
		return a.score-b.score;
	});
	console.log(candidates);
	callback(candidates);
}
// probado: falta

function correo() {
	console.log("llega a funcion del correo");
	getSubscribedUsers( function(obj) {
		var users = obj;
		console.log(users);
		users.forEach(function(user){
			// setup email data with unicode symbols
			console.log("usuario: "+user);
			var mail = user.email;
			var name = user.user_name;
			getOrderedHomeworks(function(data) {
				var hmks = data;
				console.log(hmks)
				var subj = name+', tienes '+hmks.length+' tareas para esta semana!';
				var hmklist = "<ol>";
				hmks.forEach(
					function(hmk) {
						hmklist+="<li>"+hmk.name+" (importancia: "+hmk.importance+")</li>";
					}
				);
				hmklist+="</ol>";
				var msg = "<h1>Hola "+name+"!</h1><h2>Tienes "+hmks.length+" tareas para esta semana.</h2> \
				<p> A continuación te presentamos el orden en el cual te sugerimos hacerlas:</p>"+hmklist;
				let mailOptions = {
    				'from': '"Smart Planner"', // sender address
    				'to': mail, // list of receivers
    				'subject': subj, // Subject line
    				//'text': 'Hello world ?', // plain text body
    				'html': msg // html body
    			};

				// send mail with defined transport object
				transporter.sendMail(mailOptions, (error, info) => {
					if (error) {
						return console.log(error);
					}
					console.log('Message %s sent: %s', info.messageId, info.response);
				});
			},user.hmk, 7);
		});
	});
}

// probado: falta



/*Metodo para enviar correo*/
setTimeout(function(){
	console.log("hace funcion del timeout");
	correo();
	/*setInterval(function(){
		correo();
	}, timeToSaturdayMidDay());*/ //Ahora se hace lo mismo pero con intervalo pues ya se asegura que queda exactamente una semana
}, timeToSaturdayMidDay()); //Calcula el tiempo hasta el sabado 9 am
// probado: falta

module.exports = router;
/*
mlab:
jdfandino10
claveWebDev1
*/

/*
correo:
SmartPlannerService@gmail.com
SPSclave1
*/