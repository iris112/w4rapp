var mysql = require('mysql'),
	_ = require('underscore'),
	async = require('async'),
	Promise = require('bluebird'),
	Model = require('./model'),
	Schema = require('./schema'),
	Query = require('./query'),
	EventEmitter = require('events').EventEmitter;

function Db() {
	EventEmitter.call(this);

	// TODO: Fix table names being generated before Db.connect(options);
	this.dbName = 'realfind';
	this.tablePrefix = 'rf_';
	this.ready = false;
	this.models = {};
	this.schemas = {};
	this.tables = [];
	this.installedTables = [];

	this._queue = async.queue(this.worker.bind(this), 2);
	this._queue.pause();
}

require('util').inherits(Db, EventEmitter);

Db.prototype.connect = function connect(database, options, cb) {
	if (typeof database === 'string') {
		options = options || {};
	}
	else if (typeof database === 'object') {
		cb = options;
		options = database;
		database = null;
	}
	else {
		throw new Error('Invalid connect options. Must provide a db url or object.');
	}

	if (typeof options === 'function') {
		cb = options;
		options = {};
	}

	cb = cb || function() {};

	this.options = options;
	this.dbName = options.name || 'realfind';
	this.dbTimeout = options.timeout || 28800;
	this.tablePrefix = options.tablePrefix || 'rf_';

	this.pool = mysql.createPool(database||options);

	var self = this;

	this.pool.getConnection(function(err, connection) {
		if (err) {
			console.error('connection err', err);

			return self.emit('error', err);
		}

		self.connection = connection;

		self.connection.on('error', function(err) {
			if (err.code === 'PROTOCOL_CONNECTION_LOST') {
				return;
			}

			console.error('conn err', err);

			self.emit('error', err);
		});

		self.init(cb);
	});


};

Db.prototype.init = function init(cb) {
	var self = this,
		dbName = this.dbName,
		tablePrefix = this.tablePrefix,
		con = this.connection;

	var query = Promise.promisify(con.query.bind(con));

	console.log('create', dbName);
	query('CREATE DATABASE IF NOT EXISTS ' + dbName + ' DEFAULT CHARACTER SET utf8').then(function() {
		return query('USE ' + dbName);
	}).then(function() {
		return query("SHOW TABLES LIKE '" + tablePrefix + "%'");
	}).then(function(results) {
		for (var i= 0, len=results.length; i<len; i++) {
			self.installedTables.push(results[i]['Tables_in_'+dbName+' ('+tablePrefix+'%)']);
		}
	}).then(function() {
		self.pool.on('connection', function(connection) {
			connection.query('use '+dbName);
		});

		self.connection.release();

		self.ready = true;
		self.query = self._query;

		if (self._queue.length()) {
			self._queue.drain = function() {
				delete self._queue;
			};

			self._queue.resume();
		}
		else {
			delete self._queue;
		}

		self.emit('ready');
		cb();
	}).catch(function(err) {
		self.emit('error', err);
		cb(err);
	});
};

Db.prototype.worker = function worker(task, cb) {
	this.connection.query(task, cb);
};

Db.prototype.query = function safeQuery(sql, values, cb) {
	if (this.ready) {
		return this._query.apply(this, arguments);
	}

	if (typeof values === 'function' ) {
		cb = values;
		values = [];
	}

	sql = mysql.format(sql, values || []);

	this._queue.push(sql, cb);
};

Db.prototype._query = function query(sql, values, cb) {
	if (typeof values === 'function') {
		cb = values;
		values = [];
	}

	this.pool.getConnection(function(err, connection) {
		if (err) {
			console.error('pool err', err);
			return cb(err);
		}

		connection.query(sql, values, function(err, result) {
			connection.release();

			cb(err, result);
		});
	});
};

Db.prototype.model = function model(modelName, schema, options) {
	var model = this.models[modelName];

	if (model) {
		return model;
	}

	if (!schema) {
		throw new Error('That model does not exist. You must provide a Schema to create it.');
	}

	if (!(schema instanceof Schema)) {
		throw new Error('Invalid schema.');
	}

	// Create the Model.

	model = this.createModel(modelName, schema, options);
	this.schemas[modelName] = schema;
	this.models[modelName] = model;
	this.tables.push(model.tableName);

	var self = this;

	setImmediate(function() {
		self.syncModel(modelName, options, function(err) {
			if (err) {
				model.onComplete(err);
				return self.emit('error', err);
			}

			model.onComplete();
		});
	});

	return model;
};

Db.prototype.createModel = function createModel(modelName, schema, options) {
	options = options || {};
	options.db = this;

	return Model.create(modelName, schema, options);
};

Db.prototype.syncModel = function syncModel(modelName, options, cb) {
	if (typeof options === 'function') {
		cb = function() {};
		options = {};
	}

	options = options || {};
	cb = cb || function() {};

	var model = this.models[modelName];

	model.tableName = (this.tablePrefix||'') + (modelName+'s');
	model.tableName = model.tableName.toLowerCase();

	if (~this.installedTables.indexOf(model.tableName)) {
		return cb();
	}

	var self = this;

	if (model.noDefaultTable) {
		return cb();
	}

	var schema = model.schema,
		sql = schema.getCreateTableQuery(model.tableName, true);

	var query = Promise.promisify(self.query.bind(self));
	query(sql).then(function() {
		if (!model.onLoad) {
			return cb();
		}

		model.onLoad(cb);
	}).catch(cb);
};

Db.prototype.Db = Db;
Db.Model = Db.prototype.Model = Model;
Db.Schema = Db.prototype.Schema = Schema;
Db.Query = Db.prototype.Query = Query;

module.exports = new Db();