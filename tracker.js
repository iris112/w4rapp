var config = require('./config'),
	urlParse = require('url').parse,
	inherits = require('util').inherits,
	events = require('events'),
	mysql = require('mysql'),
	db = require('./db'),
	Visit = require('./models/visit');

function Tracker(callback) {
	events.EventEmitter.call(this);

	if (typeof callback === 'function') {
		this.once('ready', callback);
		this.once('error', callback);
	}

	this.route = config.get('route');

	this.db = db;

	var cfg = config.get('db');

	this.db.on('error', function(err) {
		console.error('connection error', err);

		if (err.fatal) {
			self.emit('error', err);
		}
	});

	var self = this;

	this.db.on('ready', function() {
		self.emit('ready');
	});

	this.db.connect(cfg, this.init.bind(this));
}

inherits(Tracker, events.EventEmitter);

Tracker.prototype.init = function init(err) {
	if (err) {
		return this.emit('error', err);
	}

	return this.emit('ready');
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

	//var data = this.extractDataFromRequest(req);

	this.processData(req);
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

	q.page = req.headers.referer;

	return q;

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

	var page = req.headers.referer;

	action.type = 'pageview';
	action.page = page;

	var site = q.site,
		referrer = q.referrer;

	return {
		visitor: visitor,
		visit: visit,
		action: action,
		traffic: traffic,
		site: site,
		referrer: referrer
	};
}

Tracker.prototype.processData = function processData(req) {
	return Visit.handle(req);
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

module.exports = Tracker;