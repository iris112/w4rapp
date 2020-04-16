/**
 * @module models
 */

var db = require('../db'),
	Schema = db.Schema,
	tool = require('../utils/tool'),
	cache_manager = require('cache-manager'),
	cache = cache_manager.caching({store: 'memory', max: 100, ttl: 10}),
	mysql = require('mysql'),
	Visit = require('./visit'),
	Action = require('./action'),
	Model = db.Model,
	Promise = require('bluebird');

var Site;

/**
 * @constructor Site
 */
var SiteSchema = new Schema({
	id: 'INTEGER UNSIGNED NOT NULL AUTO_INCREMENT',
	account: 'INTEGER UNSIGNED UNIQUE NOT NULL',
	name: 'VARCHAR(255) NOT NULL',
	main_url: 'VARCHAR(255) NOT NULL',
	created: 'TIMESTAMP NOT NULL'
});

SiteSchema.indexes = [
	'PRIMARY KEY(id)',
    'UNIQUE (account)',
    'UNIQUE (main_url)'
];

function hexToInt(str) {
	var buf = new Buffer(str, 'hex'),
		int = buf.readUInt32LE(0);

	return int;
}

function accountStrToInt(str) {
  if (!str) return false;

	if (!str.match(/^SA-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}$/)) {
		return false;
	}

	return hexToInt(str.replace('SA-', '').replace('-', ''));
}

function intToAccountStr(int) {
	var buf = new Buffer(4);

	buf.writeUInt32LE(int, 0);

	var hex = buf.toString('hex').toUpperCase();

	return 'SA-'+hex.substr(0, 4)+'-'+hex.substr(4,8);
}

/**
 * @methodOf module:models~Site
 * @static
 * @param accountStr
 * @param callback
 */
SiteSchema.statics.getByAccount = function(accountStr, callback) {
	return Site._getByAccount(accountStr).asCallback(callback);
};

SiteSchema.statics._getByAccount = Promise.coroutine(function*getByAccount(accountStr) {
	if (!accountStr) {
		return Promise.reject(new Error('Account must be provided.'));
	}
	
	return yield cache.wrap(accountStr, ()=>{
		var int = accountStrToInt(accountStr);

		if (!int) return Promise.reject(new Error('Invalid account string.'));

		return this.findOne({account:int}).exec();
	});
});

SiteSchema.statics.accountStrToInt = accountStrToInt;
SiteSchema.statics.hexToInt = hexToInt;
SiteSchema.statics.intToAccountStr = intToAccountStr;

/**
 * @methodOf module:models~Site
 * @static
 * @param skip
 * @param limit
 * @param cb
 */
SiteSchema.statics.onLoad = function onLoad(skip, limit, cb) {
	if (typeof skip === 'function') {
		cb = skip;
		skip = 0;
		limit = 1000;
	}
	else if (typeof limit === 'function') {
		cb = limit;
		limit = 1000;
	}

	if (skip < 0)
		skip = 0;

	if (limit < 1 || limit > 1000)
		limit = 1000;

	// A hack to force this to execute before the model is declared ready.
	this.ready = true;

	Site.find().limit(skip, limit).exec(function(err, results) {
		if (err) {
			return cb(err);
		}

		if (!results || results.length === 0) {
			return cb();
		}

		Promise.map(results, Site.createSiteTables).then(function() {
			if (results.length < limit) {
				return cb();
			}

			return Site.onLoad(skip+limit, limit, cb);
		}).catch(cb);
	});
};

SiteSchema.statics.createSite = function createSite(data, cb) {
	Site.save(data, true, function(err, site) {
		if (err || !site) {
			return cb(err);
		}

		Site.createSiteTables(site, cb);
	});
};

SiteSchema.statics.createSiteTables = function createSiteTables(site, cb) {
	if (!site || !site.id) return cb(new Error('Invalid site or site id.'));

	var actTblSql = Action.schema.getCreateTableQuery(Site.getActionTableName(site), true),
		visTblSql = Visit.schema.getCreateTableQuery(Site.getVisitTableName(site), true);

	var query = Promise.promisify(Site.query.bind(Site));

	Promise.map([actTblSql, visTblSql], function(sql) {
		return query(sql);
	}).then(function() {
		return site;
	}).nodeify(cb);
};

SiteSchema.statics.getActionTableName = function(site) {
	return db.tablePrefix+site.id+'_'+Model.toTableName(Action.modelName);
};

/**
 * @methodFor module:models~Site
 * @param site
 * @returns {string}
 */
SiteSchema.statics.getVisitTableName = function(site) {
	return db.tablePrefix+site.id+'_'+Model.toTableName(Visit.modelName);
};

Site = module.exports = db.model('Site', SiteSchema);

