var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectId;
var moment = require('moment');
var CronJob = require('cron').CronJob;
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

//--------------Funciones de peticiones
/* GET usuario o all users si user_name no esta definido*/
router.get('/users', function (req, res) {
	var username = req.query.username;
	getUsers(username, function (users) {
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(users));
	});
});
// probado: bien!

router.get('/users/:id/hmks', function(req, res, next){
	//en req.query hay categoria y orden
	try{
		var categoria = req.query.categoria;
		var orden = req.query.orden;
		var userId = ObjectId(req.params.id);
		getHmks(userId, categoria, orden, function(hmks){ // TODO: falta modificar getHmks
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify(hmks));
		});
	}catch(e){
		res.send(e);
	}
});


/* POST de una tarea a un usuario segun su id*/
router.post('/users/:id/hmks', function (req, res) {
	try{
		var id = ObjectId(req.params.id);
		var hmk = req.body;
		hmk._id = new ObjectId();
		addHmkToUser(id, hmk, function(obj){
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify(obj));
		});
	}catch(e){
		res.send(e);
	}
});
// probado: bien!


/* PUT modifica una tarea a un usuario segun su id*/
router.put('/users/:id/hmks/:id_h', function (req, res) {
	try{
		var idUser = ObjectId(req.params.id);
		var idHmk = ObjectId(req.params.id_h);
		var hmk = req.body;
		//TODO: modificar la tarea

	}catch(e){
		res.send(e);
	}
});


/* DELETE una tarea de un usuario segun su id*/
router.delete('/users/:id/hmks/:id_h', function(req, res){
	try{
		var idUser = ObjectId(req.params.id);
		var idHmk = ObjectId(req.params.id_h);
		deleteHmk(idUser, idHmk, function(obj){ //falta modificar la funcion
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify(obj));
		});
	}catch(e){
		res.send(e);
	}
});
// probado: bien!

/*PUT de un usuario segun su id*/
router.put('/users/:id', function(req, res){
	try{
		var idUser = ObjectId(req.params.id);
		var user = req.body;
		//TODO: modificar un usario
	}catch(e){
		res.send(e);
	}
});
//--------------Fin funciones de peticiones

//--------------Funciones de consulta a BD
/*Metodo que retorna las tareas*/
function getHmks(userIdObj, callback) {//TODO: Completar funcion getHmks
	callback([]);
}

/*Metod que da el histórico de tareas ordenado cronologicamente*/
function getHistoricHmks(userIdObj, callback){
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);
		var usersCol = db.collection("Users");
		usersCol.find( {'_id':userIdObj}, {'hmk':1}).toArray(function(err, data){
			assert.equal(null, err);
			cronologicalOrder(data[0].hmk);
			callback(data);
		});
	});
}

/*Metodo que da los usuarios*/
function getUsers(username, callback) {
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);
		var f = {'user_name':username};
		if(!username) f={};
		var usersCol = db.collection("Users");
		usersCol.find(f, {'hmk':0}).toArray(function(err, data){
			assert.equal(null, err);
			callback(data);
		});
	});
}
// probado: bien!


/*Metodo que agrega tarea a un usuario*/
function addHmkToUser(objId, hmk, callback) {
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);
		var usersCol = db.collection("Users");
		usersCol.update({'_id': objId}, {$push: {'hmk':hmk}}, function(err, status){
			assert.equal(null, err);
			callback(status);
		});
	});
}
// probado: bien!

/*Metodo que elimina tarea de un usuario*/
function deleteHmk(userIdObj, hmkIdObj, callback) {
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);
		var usersCol = db.collection("Users");
		usersCol.update({'_id': userIdObj}, {$pull:{'hmk':{'_id': hmkIdObj}}}, function(err, status){
			assert.equal(null, err);
			callback(status);
		});
	});
}
// probado: bien!

/*Metodo que da usuarios que estan suscritos al correo*/
function getSubscribedUsers(callback) {
	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);
		var f = {'subscribed':'true'};
		var usersCol = db.collection("Users");
		console.log("va a hacer el query");
		usersCol.find(f).toArray(function(err, data){
			assert.equal(null, err);
			callback(data);
		});
	});
}
// probado: falta

//--------------Funciones de ordenar
function cronologicalOrder(hmkArr) {
	hmkArr.sort(function(a, b){
		return b.limit_date-a.limit_date;
	});
}
// probado: bien!

function importanceOrderHmks(hmks, maxDate){
	var maxMilis = Infinity;
	var minDate = moment().valueOf();
	if(maxDate) maxMilis = moment().add(maxDate, 'days').valueOf();
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
	return candidates;
}
// probado: falta
//--------------Fin funciones de ordenar


//--------------Funciones de correo
/* Funcion que manda el correo a los usuarios suscritos*/
function correo() {
	getSubscribedUsers( function(obj) {
		var users = obj;
		users.forEach(function(user){
			// setup email data with unicode symbols
			var mail = user.email;
			var name = user.user_name;
			var hmks = importanceOrderHmks(user.hmk, 7);
			var subj = name+', tienes '+hmks.length+' tareas para esta semana!';
			const list = hmks.map(hmk => "<li>"+hmk.name+" (importancia: "+hmk.importance+")</li>");
			const hmklist = '<ol>' + list.join('') + '</ol>';
			var msg = "<h1>Hola "+name+"!</h1><h2>Tienes "+hmks.length+" tareas para esta semana.</h2> \
			<p> A continuación te presentamos el orden en el cual te sugerimos hacerlas:</p>"+hmklist;
			sendMail(mail, subj, msg);
		});
	});
}

function sendMail(mail, subj, msg){
	let mailOptions = {
    	'from': 'Smart Planner <smart_planner@no_reply.com>', // sender address
    	'to': mail, // list of receivers
    	'subject': subj, // Subject line
    	//'text': 'Hello world ?', // plain text body
    	'html': msg // html body -> se puede {'path':'http://....'}!!! re util jaja
    };

	// send mail with defined transport object
	transporter.sendMail(mailOptions, (error, info) => {
		if (error) {
			return console.log(error);
		}
		console.log('Message %s sent: %s', info.messageId, info.response);
	});
}

// probado: falta




//setTimeout(function(){
//	console.log("hace funcion del timeout");
//	correo();
	/*setInterval(function(){
		correo();
	}, timeToSaturdayMidDay());*/ //Ahora se hace lo mismo pero con intervalo pues ya se asegura que queda exactamente una semana
//}, timeToSaturdayMidDay()); //Calcula el tiempo hasta el sabado 9 am
// probado: falta

/*Metodo para enviar correo*/
/*CRONJOB: '* * * * * *' -> 'Seg(0-59) Min(0-59) Hora(0-23) DiaMes(1-31) Mes(0-11) DiaSemana (0-6)'*/
var job = new CronJob('00 00 8 * * 5', function() {
  /*
   * Corre todos los sabados
   * a las 8:30:00 AM.
   */
   correo();
},
true
);
job.start();
console.log('job status', job.running); 
//--------------Fin funciones de correo

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