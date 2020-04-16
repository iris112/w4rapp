var async = require('async'),
	mysql = require('mysql'),
	_ = require('underscore'),
	Query = require('./query');

function Model(data) {
	this.isNew = true;

	var fields = this.constructor.schema.fields;

	if (!data) return;

	for( var p in data ) {
		if (!fields[p]) continue;

		this[p] = data[p];
	}
}

var statics = {},
	methods = {};

Model.create = function create(modelName, schema, options) {
	function NewModel(fields) {
		if (!(this instanceof NewModel)) {
			return new NewModel(fields);
		}

		Model.call(this, fields);
	}

	require('util').inherits(NewModel, Model);

	options = options || {};
	var db = options.db || {};

	var tableName = options.tableName || Model.toTableName(modelName, db.tablePrefix);
	var both = {modelName: modelName, schema:schema, options:options, tableName:tableName, db:db};

	_.extend(NewModel, schema.statics, statics, both);
	_.extend(NewModel.prototype, schema.methods, methods, both);

	NewModel.init();

	return NewModel;
};

Model.toTableName = function toTableName(modelName, prefix) {
	var tableName = modelName.toLowerCase()+'s';

	return prefix ? prefix + tableName : tableName;
};

statics.init = function init() {
	this._queue = [];
	this.ready = false;
};

statics.query = function query(sql, values, cb) {
	if (this.ready) {
		return this.db.query(sql, values, cb);
	}

	this._queue.push(Array.prototype.slice.call(arguments));
};

statics.onComplete = function onComplete(err) {
	if (err) {
		console.error('Error loading model ' + this.modelName, err);
		return;
	}

	this.ready = true;

	var i, len;

	if (this._queue) {
		for( i= 0, len=this._queue.length; i<len; i++ ) {
			this.db._query.apply(this.db, this._queue[i]);
		}

		delete this._queue;
	}

	if (this._readyQueue) {
		while( this._readyQueue.length ) {
			this._readyQueue.shift()();
		}

		delete this._readyQueue;
	}
};

statics.onReady = function onReady(cb) {
	(this._readyQueue = this._readyQueue || []).push(cb);
};

statics.save = function save(record, retrieve, cb) {
	if (typeof retrieve === 'function') {
		cb = retrieve;
		retrieve = false;
	}

	var query = new Query(this);
	query.insert(record);

	if (retrieve) {
		query.retrieve('id');
	}

	if (typeof cb === 'function') {
		query.exec(cb);
	}

	return query;
};

statics.update = function update(where, record, cb) {
	var query = new Query(this);

	query.update(where, record);

	if (typeof cb !== 'undefined') {
		query.exec(cb);
	}

	return query;
};

statics.find = function find(condition, fields, cb) {
	if (typeof fields === 'function') {
		cb = fields;
		fields = '*';
	}

	if (typeof condition === 'function') {
		cb = condition;
		condition = '';
		fields = '*';
	}

	var query = new Query(this);

	query.find().where(condition).select(fields);

	if (cb) {
		query.exec(cb);
	}

	return query;
};

statics.findOne = function findOne(condition, fields, cb) {
	var query = new Query(this);

	query.findOne();

	if (!arguments.length) return query;

	if (typeof fields === 'function') {
		cb = fields;
		fields = '*';
	}

	for( var p in condition ) {
		query.where(p, condition[p]);
	}

	query.select(fields);

	if (typeof cb === 'function') {
		return query.exec(cb);
	}

	return query;
};

module.exports = Model;
