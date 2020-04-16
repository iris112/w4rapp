var nconf = require('nconf'),
	config = require('./config'),
	urlParse = require('url').parse,
	inherits = require('util').inherits,
	events = require('events'),
	mysql = require('mysql'),
	async = require('async');

function Tracker(callback) {
	events.EventEmitter.call(this);

	if (typeof callback === 'function') {
		this.once('ready', callback);
		this.once('error', callback);
	}

	this.route = nconf.get('route');

	var db = require('./db'),
		cfg = nconf.get('db');

	db.connect(cfg);

	this.connection = mysql.createConnection({
		host: db.host,
		user: db.user,
		port: db.port,
		password: db.password
	});

	var self = this;

	this.connection.on('error', function(err) {
		console.log('connection error', err);
		self.emit('error', err);
	});

	console.log('connect');

	this.connection.connect(function(err) {
		if (err) {
			self.emit('error', err);
			return;
		}

		self.init();
	});
}

inherits(Tracker, events.EventEmitter);

Tracker.prototype.init = function init() {
	var self = this,
		con = this.connection;

	var dbName = nconf.get('db:name'),
		tbPrefix = nconf.get('db:tablePrefix');

	async.series([
		function(cb) {
			console.log('create', dbName);
			con.query('CREATE DATABASE IF NOT EXISTS ' + dbName + ' DEFAULT CHARACTER SET utf8', cb);
		},
		function(cb) {
			console.log('use', dbName);
			con.query('USE ' + dbName, cb);
		},
		function(cb) {
			var visit = require('./models/visit');
			console.log('show tables like', tbPrefix+visit.tableName);
			con.query("SHOW TABLES LIKE '" + tbPrefix + visit.tableName + "%'", function(err, result) {
				console.log('show tables:', result);
				if (result.length) {
					return cb(null);
				}

				var sql = visit.getCreateTableQuery(tbPrefix);
				console.log('create', sql);

				con.query(visit.getCreateTableQuery(tbPrefix), function(err, result) {
					console.log('Create table result', result);
					cb(err);
				});
			});
		}
	], function(err, result) {
		if (err) {
			return self.emit('error', err);
		}

		self.emit('ready');
	});
};

var imBuf = new Buffer([
	0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
	0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x2c,
	0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
	0x02, 0x44, 0x01, 0x00, 0x3b]);

Tracker.prototype.middleware = function(req, res) {
	// Send the image immediately.
	res.send(imBuf, {'Content-Type': 'image/gif'}, 200);

	var data = urlParse(req.url, true),
		q = data.query || {};

	// TODO: Validate input.

	var data = this.extractDataFromRequest(req);

	console.log('data', data);

	this.processData(data);
};

function parseCookieValue(cookieValue) {
	console.log('parse', cookieValue);
	return cookieValue ? cookieValue.split('.') : '';
}

Tracker.prototype.extractDataFromRequest = function extractDataFromRequest(req) {
	var visitor = {},
		visit = {},
		action = {},
		traffic = {};

	var data = urlParse(req.url, true),
		q = data.query || {};

	var cVisitor = parseCookieValue(q.visitor),
		cCurrent = parseCookieValue(q.current);

	visitor.id = this.hexToInt(cVisitor[0]); //this.uuidToBinary(cVisitor[0]);
	visitor.firstVisit = new Date(1000*Math.floor(1*cVisitor[1] / 1000));
	visitor.currentVisit = new Date(1000*Math.floor(1*cVisitor[2] / 1000));
	visitor.totalVisits = 1*cVisitor[3];

	if (!visitor.id)
		return false;

	visit.startTime = new Date(1000*Math.floor(1*cCurrent[0] / 1000));
	visit.pageViews = 1*cCurrent[1];

	traffic.referrer = q.traffic;

	var referrer = req.headers.referer;

	action.type = 'pageview';
	action.page = referrer;

	return {
		visitor: visitor,
		visit: visit,
		action: action,
		traffic: traffic
	};
}

Tracker.prototype.processData = function processData(data) {
	var visitor = data.visitor,
		visit = data.visit,
		traffic = data.traffic,
		action = data.action,
		tablePrefix = nconf.get('db:tablePrefix'),
		con = this.connection;

	async.parallel([
		function(cb) {
			var existsSql = "SELECT * FROM " + tablePrefix + "visit WHERE visitor_id = ? AND last_action_time >= ? LIMIT 1",
				date = new Date(1000 * Math.floor(Date.now() / 1000));

			con.query(existsSql, [visitor.id, visit.startTime], function(err, results) {
				console.log('exists', err, results && results[0]);

				if (err) return cb(err);

				if (results.length) {
					// Exists. Update visit.
					var updateSql = 'UPDATE ' + tablePrefix + 'visit SET last_action_time=? WHERE visit_id = ?';

					console.log('UPDATE ' + tablePrefix + 'visit SET last_action_time='+ con.escape(date) +' WHERE visit_id = ' + con.escape(results[0].visit_id));

					return con.query(updateSql, [date, results[0].visit_id], cb);
				}
				else {
					// Doesn't exist. Create new visit.
					var insertSql = 'INSERT INTO ' + tablePrefix + 'visit (visitor_id, first_action_time, last_action_time) VALUES (?, ?, ?)';

					return con.query(insertSql, [visitor.id, visit.startTime, visit.startTime], cb);
				}
			});
		}
	], function(err, results) {
		console.log('finish', err, results);
	});
};

Tracker.prototype.hexToInt = function hexToInt(str) {
	var buf = new Buffer(str, 'hex'),
		int = buf.readUInt32LE(0);

	return int;
};

Tracker.prototype.uuidToBinary = function uuidToBinary(str) {
	var uidBuf = new Buffer(str.replace(/-/g, ''), 'hex'),
		uid = uidBuf.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

	if (uid !== str)
		return false;

	return uidBuf;
};

Tracker.prototype.handleVisit = function handleVisit(req) {

};

Tracker.prototype.insertNewVisit = function insertNewVisit(visit) {

};

Tracker.prototype.updateExistingVisit = function updateExistingVisit(valuesToUpdate) {

};

exports.Tracker = Tracker;