var _ = require('underscore');

function Schema(fields) {
	this.fields = fields;
	this.keys = Object.keys(this.fields);

	this.statics = {};
	this.methods = {};
}

Schema.prototype.getCreateTableQuery = function getCreateTableQuery(tableName, ifNotExists) {
	ifNotExists = ifNotExists ? 'IF NOT EXISTS ' : '';

	var query = 'CREATE TABLE ' + ifNotExists + tableName + ' (';

	var entry, i, len;

	i = 0;

	_.each(this.fields, function(val, key) {
		if (i > 0) query += ', ';

		query += key + ' ' + val;

		i++;
	});

	for( i= 0, len=this.indexes.length; i<len; i++ ) {
		entry = this.indexes[i];

		query += ', ' + entry;
	}

	query += ') DEFAULT CHARSET=' + (this.charset);

	return query;
};

Schema.prototype.charset = 'utf8';
Schema.prototype.indexes = [];

module.exports = Schema;