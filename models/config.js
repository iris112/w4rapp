var db = require('../db'),
	Schema = db.Schema,
	Query = db.Query;

var Config;

var ConfigSchema = new Schema({
	idconfig: 'INTEGER UNSIGNED NOT NULL AUTO_INCREMENT',
	idvisit: 'INTEGER UNSIGNED NOT NULL',
	idsite: 'INTEGER UNSIGNED NOT NULL',
	idvisitor: 'INTEGER UNSIGNED NOT NULL',
	config_hash: 'BINARY(8) NOT NULL',
	config_os: 'CHAR(3) NOT NULL',
	config_browser_name: 'VARCHAR(10) NOT NULL',
	config_browser_version: 'VARCHAR(20) NOT NULL',
	config_resolution: 'VARCHAR(9) NOT NULL',
	config_plugins: 'BIT(16) NOT NULL', // pdf, flash, java, director, quicktime, realplayer, windowsmedia, gears, silverlight, cookie
	location_ip: 'VARBINARY(16) NOT NULL',
	location_browser_lang: 'VARCHAR(20) NOT NULL',
//	location_country: 'CHAR(3) NOT NULL',
//	location_region: 'CHAR(2) DEFAULT NULL',
//	location_city: 'VARCHAR(255) DEFAULT NULL',
//	location_latitude: 'FLOAT(10, 6) DEFAULT NULL',
//	location_longitude: 'FLOAT(10, 6) DEFAULT NULL'
});

ConfigSchema.indexes = [
	'PRIMARY KEY(idconfig)',
	'INDEX index_hash (hash)'
];

var pluginMaskSize = 16;

var pluginMap = {
	cookie: 0,
	ag: 1,
	gears: 2,
	wma: 3,
	realp: 4,
	qt: 5,
	dir: 6,
	java: 7,
	fla: 8,
	pdf: 9
};

ConfigSchema.statics.createConfig = function createConfig(req, data, visit) {
	var config = new Config();
	
	var dataPlugins = data['cplu'],
		plugins = new Array(pluginMaskSize);
	
	var i = pluginMaskSize;
	
	while (--i) {
		plugins[i] = 0;
	}
	
	for( var p in pluginMap ) {
		if (dataPlugins[p] === '1') {
			plugins[pluginMap[p]] = 1;
		}
	}
	
	config.config_plugins = Query.dontEscape("b'"+plugins.join('')+"'");
	config.idvisit = visit.id;
	config.idsite = visit.idsite;
	config.idvisitor = visit.idvisitor;
	config.config_os = 'CHAR(3) NOT NULL',
	config.config_browser_name = 'VARCHAR(10) NOT NULL',
	config.config_browser_version = 'VARCHAR(20) NOT NULL',
	config.config_resolution = 'VARCHAR(9) NOT NULL',
	config.config_plugins = 'BIT(16) NOT NULL', // pdf, flash, java, director, quicktime, realplayer, windowsmedia, gears, silverlight, cookie
	config.location_ip = 'VARBINARY(16) NOT NULL',
	config.location_browser_lang = 'VARCHAR(20) NOT NULL',
	config.location_country = 'CHAR(3) NOT NULL',
	config.location_region = 'CHAR(2) DEFAULT NULL',
	config.location_city = 'VARCHAR(255) DEFAULT NULL',
	config.location_latitude = 'FLOAT(10, 6) DEFAULT NULL',
	config.location_longitude = 'FLOAT(10, 6) DEFAULT NULL'

	config.config_hash = 'BINARY(8) NOT NULL'
};

Config = module.exports = db.model('Config', ConfigSchema);