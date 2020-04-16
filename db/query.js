var mysql = require('mysql'),
	Promise = require('bluebird');

function Query(model) {
	this._select = false;
	this._findOne = false;
	this._model = model;
	this._table = typeof model === 'string' ? model : model.tableName;
	this._order = '';
	this._where = '';
	this._fields = '*';
	this._retrieve = false;
	this._insert = false;
	this._set = false;
}

function DontEscape(val) {
	this.value = val;
}

Query.dontEscape = Query.prototype.dontEscape = function dontEscape(val) {
	return new DontEscape(val);
};

Query.escape = Query.prototype.escape = function escape(val) {
	return val instanceof DontEscape ? val.value : mysql.escape(val);
};

Query.escapeId = Query.prototype.escapeId = function escapeId(val) {
	return val instanceof DontEscape ? val.value : mysql.escapeId(val);
};

Query.format = Query.prototype.format = function format(sql, values, stringifyObjects, timeZone) {
	values = [].concat(values);

	return sql.replace(/\?\??/g, function(match) {
		if (!values.length) {
			return match;
		}

		if (match == "??") {
			return Query.escapeId(values.shift());
		}
		return Query.escape(values.shift(), stringifyObjects, timeZone);
	});
};

Query.prototype.insert = function insert(obj) {

	this._insert = true;

	if (!obj) return this;

	return this.set(obj);
};

Query.prototype.update = function update(where, record) {
	this._update = true;

	if (where) {
		this.where(where);
	}

	if (record) {
		this.set(record);
	}

	return this;
};

Query.prototype.set = function set(obj) {
	this._set = '';

	var o = {}, i= 0, len, p;

	if (this._model) {
		var fields = this._model.schema.fields;

		for ( p in fields ) {
			if (typeof obj[p] === 'undefined' ) continue;

			o[p] = obj[p];
		}

		obj = o;
	}

	i = 0;

	for( p in obj ) {
		if (i++>0) this._set += ', ';

		this._set += Query.escapeId(p) + '=' + Query.escape(obj[p]);
	}

	return this;
};

Query.prototype.retrieve = function retrieve(autoKey) {
	this._retrieve = autoKey;
	return this.findOne();
};

Query.prototype.find = function find() {
	return this.select();
};

Query.prototype.findOne = function findOne() {
	this._findOne = true;
	this._limit = 1;

	return this.select();
};

Query.prototype.table = function table(tableName) {
	this._table = tableName;
	return this;
};

Query.prototype.select = function select(fields) {
	if (Array.isArray(fields)) {
		if (fields.length === 0) {
			fields = '*';
		}
		else {
			fields = fields.join(', ');
		}
	}

	if (!fields) fields = '*';

	this._select = true;
	this._fields = fields;

	return this;
};

Query.prototype.limit = function limit(offset, numRows) {
	if (typeof numRows === 'undefined') {
		numRows = offset;

		this._limit = numRows;
	}
	else {
		this._limit = offset+','+numRows;
	}

	return this;
};

Query.prototype.where = function where(key, value) {
	if (!key) {
		return this;
	}

	if (typeof key === 'string') {
		return this.$where(key+'=?', value);
	}

	for( var p in key ) {
		this.$where(p+'=?', key[p]);
	}

	return this;
};

Query.prototype.$where = function $where(sql, values) {
	if (this._where) this._where += ' AND ';

	this._where += Query.format(sql, values);

	return this;
};

Query.prototype.orderBy = function orderBy(field) {
	this._order = field;
};

Query.prototype.exec = function(callback) {
	return this._exec().asCallback(callback);
}

Query.prototype.exec = function exec(callback) {
	return new Promise((resolve, reject) => {
		var cb = (err, results) => {
			if (err) return reject(err);
			else return resolve(results);
		};
		
		if (this._findOne) {
			this._limit = 1;

			let _cb = cb;

			cb = (err, results) => {
				if (err) return _cb(err);

				return _cb(null, results && results[0]);
			};
		}

		var sql = '';

		if (this._insert) {
			sql = getInsertStatement(this);

			if (this._retrieve) {
				let __cb = cb;

				cb = (err, results) => {
					if (err) {
						return __cb(err);
					}

					var insertId = results.insertId;

					if (!insertId) {
						return cb();
					}

					this._where = Query.escapeId(this._retrieve)+'='+Query.escape(insertId);

					var sql = getSelectStatement(this);

					this._model.query(sql, __cb);
				};
			}
		}
		else if (this._select) {
			sql = getSelectStatement(this);
		}
		else if (this._update) {
			sql = getUpdateStatement(this);
		}

		if (!sql)
			return cb(new Error('Failed to generate sql.'));

		this._model.query(sql, function() {
			cb.apply(null, arguments);
		});
	}).asCallback(callback);
};

function getInsertStatement(query) {
	var sql = 'INSERT INTO '+query._table+' SET '+query._set;

	return sql;
}

function getSelectStatement(query) {
	var sql = 'SELECT '+query._fields+' FROM '+query._table;

	if (query._where) {
		sql += ' WHERE '+query._where;
	}

	if (query._order) {
		sql += ' ORDER BY '+query._order;
	}

	if (query._limit) {
		sql += ' LIMIT '+query._limit;
	}

	return sql;
}

function getUpdateStatement(query) {
	var sql = 'UPDATE '+query._table+' SET '+query._set;

	if (query._where) {
		sql += ' WHERE '+query._where;
	}

	if (query._order) {
		sql += ' ORDER BY '+query._order;
	}

	if (query._limit) {
		sql += ' LIMIT '+query._limit;
	}

	return sql;
}

module.exports = Query;