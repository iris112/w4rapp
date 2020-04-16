var db = require('../db'),
	Schema = db.Schema,
	Site = require('./site'),
	Action = require('./action'),
	C = require('chain2'),
	tool = require('../utils/tool'),
    VisitError = tool.VisitError,
	urlParse = require('url').parse,
	useragent = require('useragent'),
	Query = db.Query,
	MurmurHash3 = require('imurmurhash'),
	Promise = require('bluebird');
//	geoip = require('geoip-lite');

var Visit;

/**
 * @constructor
 */
var VisitSchema = new Schema({
	id:                     'INTEGER UNSIGNED NOT NULL AUTO_INCREMENT',
	idsite:                 'INTEGER UNSIGNED NOT NULL',
	idvisitor:              'INTEGER UNSIGNED NOT NULL',
	iduser:                 'INTEGER UNSIGNED',
	local_time:             'TIME NOT NULL',
	returning:              'BOOLEAN NOT NULL',
	count_visits:           'SMALLINT UNSIGNED NOT NULL',
	last_visit:             'DATETIME NOT NULL',
	first_visit:            'DATETIME NOT NULL',
	first_action_time:      'DATETIME NOT NULL',
	last_action_time:       'DATETIME NOT NULL',
	first_idaction:         'INTEGER UNSIGNED NULL DEFAULT 0',
	last_idaction:          'INTEGER UNSIGNED NULL DEFAULT 0',
	total_actions:          'SMALLINT UNSIGNED NULL DEFAULT 0',
	duration:               'SMALLINT UNSIGNED NULL DEFAULT 0',
	traffic_source:         'TEXT',
    traffic_medium:         'VARCHAR(255)',
    traffic_name:           'VARCHAR(255)',
	referrer_url:           'TEXT NOT NULL',
	config_hash:            'INTEGER UNSIGNED NOT NULL',
	config_os:              'VARCHAR(20) NOT NULL',
	config_browser_name:    'VARCHAR(10) NOT NULL',
	config_browser_version: 'VARCHAR(20) NOT NULL',
	config_browser_lang:    'VARCHAR(20) NOT NULL',
	config_resolution:      'VARCHAR(9) NOT NULL',
	config_plugins:         'BIT(16) NOT NULL', // pdf, flash, java, director, quicktime, realplayer, windowsmedia, gears, silverlight, cookie
	config_ip:              'INTEGER UNSIGNED NOT NULL',
//	config_country:         'CHAR(2) DEFAULT NULL',
//	config_region:          'CHAR(2) DEFAULT NULL',
//	config_city:            'VARCHAR(255) DEFAULT NULL',
//	config_latitude:        'FLOAT(10, 6) DEFAULT NULL',
//	config_longitude:       'FLOAT(10, 6) DEFAULT NULL',
	custom_k1:              'VARCHAR(255) DEFAULT NULL',
	custom_v1:              'VARCHAR(255) DEFAULT NULL'
});

VisitSchema.indexes = [
	'PRIMARY KEY(id)',
	'INDEX index_idsite_idvisitor_lastactiontime (idsite, idvisitor, last_action_time)',
	'INDEX index_idsite_confighash_lastactiontime (idsite, config_hash, last_action_time)'
];

VisitSchema.statics.noDefaultTable = true;

VisitSchema.statics.onLoad = function onLoad(cb) {
	//return cb();

	process.nextTick(function() {
		Site = require('./site');
		Site.onReady(cb);
	});
};

function hexToInt(str) {
	var buf = new Buffer(str, 'hex'),
		int = buf.readUInt32BE(0);

	return int;
}

function toTimeString(hours, minutes, seconds) {
	var str = '';

	if (hours < 10)
		str += '0';

	str += hours + ':';

	if (minutes < 10)
		str += '0';

	str += minutes + ':';

	if (seconds < 10)
		str += '0';

	str += seconds;

	return str;
}

VisitSchema.statics.VISIT_DURATION = 30 * 60 * 1000; // Thirty minutes.

VisitSchema.statics.handle = function(request, callback) {
	return Visit._handle(request)
		.catch(function(err) {
			if (err instanceof VisitError) {
				console.error(err.message);
			}
			else {
				console.error('handle failed', err, err.stack);
			}
		}).asCallback(callback);
};

VisitSchema.statics._handle = Promise.coroutine(function*(request) {
	var parsedUrl = urlParse(request.url, true),
		data = parsedUrl.query || {};

	data.page = request.headers.referer;

	if (!data.page) return;

	console.log('handle', data.page);

	var site, visit, action,
		idvisitor = hexToInt(data['idv']),
		local_time = toTimeString(data.h, data.m, data.s),
		now = new Date(),
		lookBehind = new Date(now - Visit.VISIT_DURATION);

	// No idea. This variable is somehow becoming corrupted.
	Site = require('./site');

	site = yield Site.getByAccount(data['si']);

	if (!site) {
		return Promise.reject(new VisitError('Could not find site by '+data['si']+'.'));
	}

	let url = tool.parseUrl(data.page).url;

	if (!url || url.indexOf(site.main_url) !== 0) {
		return Promise.reject(new VisitError('Invalid tracking location. '+data.page+' did not match site url.'));
	}

	visit = yield Visit.getCurrentVisit(request, data, site);

	if (!visit || visit.last_action_time <= lookBehind) {
		let count = visit && visit.count_visits || 0;

		visit = yield Visit.insertNewVisit(request, data, site, count);
	}

	return yield Visit.continueVisit(request, data, visit, site);
});

/*VisitSchema.statics.handle = function handle(req) {
	var parsedUrl = urlParse(req.url, true),
		data = parsedUrl.query || {};

	data.page = req.headers.referer;

  if (!data.page) return;

	console.log('handle', data.page);

	var site, visit, action,
		idvisitor = hexToInt(data['idv']),
		local_time = toTimeString(data.h, data.m, data.s),
		now = new Date(),
		lookBehind = new Date(now - Visit.VISIT_DURATION);

	// No idea. This variable is somehow becoming corrupted.
	Site = require('./site');

	var ch = C.nCall(Site.getByAccount, Site, data['si']);
	ch.chain(function(_site) {
		site = _site;

		if (!site) {
			return this.reject(new VisitError('Could not find site by '+data['si']+'.'));
		}

		var url = tool.parseUrl(data.page).url;

		if (url.indexOf(site.main_url) !== 0) {
			return this.reject(new VisitError('Invalid tracking location. Page url did not match site url.'));
		}

		return C.nCall(Visit.getCurrentVisit, Visit, req, data, site);
	})
	.chain(function(_visit) {
		visit = _visit;

		if (visit && visit.last_action_time > lookBehind) {
			return visit;
		}

		var count = visit && visit.count_visits || 0;

		return C.nCall(Visit.insertNewVisit, Visit, req, data, site, count);
	})
	.chain(function(_visit) {
		visit = _visit;

		return C.nCall(Visit.continueVisit, Visit, req, data, visit, site);
	});

	ch.fail(function(err) {
        if (err instanceof VisitError) {
            console.error(err.message);
        }
        else {
            console.error('handle failed', err, err.stack);
        }
	});
};*/

VisitSchema.statics.getCurrentVisit = function getCurrentVisit(req, data, site, cb) {
	var idvisitor = hexToInt(data['idv']);

	var query = Visit.findOne();

	if (idvisitor && data['cookie'] === '1') {
		query.where('idvisitor', idvisitor);
	}
	else {
		var hash = Visit.getConfigHash(req, data);
		console.log('config hash', hash);
		query.where('config_hash', hash);
	}

	var now = Date.now(),
	//	lookBehind = new Date(now - Visit.VISIT_DURATION),
		lookAhead = new Date(now + Visit.VISIT_DURATION);

	query.$where('last_action_time <= ?', lookAhead);
	//query.$where('last_action_time >= ? AND last_action_time <= ?', [lookBehind, lookAhead]);

	//query.where('idsite', site.id);
	Site = require('./site');
	query.table(Site.getVisitTableName(site));

	query.orderBy('last_action_time DESC');

	return query.exec(cb);
};

var trafficSources = require('../utils/trafficSources');

VisitSchema.statics.insertNewVisit = function insertNewVisit(req, data, site, count, cb) {
	var traf = data['traf'],
		ref = data['tref'],
		idvisitor = hexToInt(data['idv']),
		local_time = toTimeString(data.h, data.m, data.s),
		now = new Date();

	if (!traf || traf !== 'direct' && tool.urlFrom(traf, site.main_url)) {
		traf = 'direct';
	}

	if (!ref) ref = 'direct';

	var visit = new Visit({
		idsite:             site.id,
		idvisitor:          idvisitor,
		config_hash:        0,
		returning:          count>0,
		count_visits:       count+1,
		local_time:         local_time,
		last_visit:         new Date(1*data['lts']),
		first_visit:        new Date(1*data['fts']),
		first_action_time:  now,
		last_action_time:   now,
		total_actions:      0,
		duration:           60, // seconds.
		traffic_source:     traf,
		referrer_url:       ref
	});

  if (data['user']) visit.iduser = parseInt(data['user']);
  if (data['csrc']) traf = visit.traffic_source = data['csrc'];
  if (data['cmdm']) visit.traffic_medium = data['cmdm'];
  if (data['cnm']) visit.traffic_name = data['cnm'];

  if (traf !== 'direct') {
    for (var i= 0, len=trafficSources.length; i<len; i++) {
      if (trafficSources[i].regex.test(traf)) {
        visit.traffic_source = trafficSources[i].name;
        //visit.traffic_medium = trafficSources[i].type || visit.traffic_medium;
        break;
      }
    }
  }

  if (visit.traffic_source === 'direct') visit.traffic_source = 'Direct';

	Visit.setConfig(visit, req, data);

	var query = Visit.save(visit, true);
	query.table(Site.getVisitTableName(site));

	return query.exec(cb);
};

VisitSchema.statics.continueVisit = function(req, data, visit, site, callback) {
	return this._continueVisit(req, data, visit, site).asCallback(callback);
};

VisitSchema.statics._continueVisit = Promise.coroutine(function *continueVisit(req, data, visit, site) {
	let prevAction, action;

	if (visit.last_idaction) {
		let prevQuery = Action.findOne();
		prevQuery.table(Site.getActionTableName(site));
		prevQuery.where({id:visit.last_idaction});

		prevAction = yield prevQuery.exec();
	}

	action = Action.createAction(data, visit, site);

	if (Action.isRepeat(prevAction, action)) {
		return;
	}

	let saveQuery = Action.save(action, true);
	saveQuery.table(Site.getActionTableName(site));

	action = yield saveQuery.exec();

	var update = {
		last_action_time:   action.time,
		last_idaction:      action.id,
		total_actions:      visit.total_actions+1
	};

	if (prevAction) {
		update.ref_duration = Math.floor((action.time - prevAction.time) / 1000);
	}
	else {
		update.first_idaction = action.id;
		update.ref_duration = 0;
	}

	if (data['user']) update.iduser = parseInt(data['user']);

	let updateQuery = Visit.update({id:visit.id}, update);
	updateQuery.table(Site.getVisitTableName(site));

	return yield updateQuery.exec();
});

/*
VisitSchema.statics.continueVisit = function continueVisit(req, data, visit, site, cb) {
	var ch = C.chain(),
		prevAction,
		action;

	if (visit.last_idaction) {
		var prevQuery = Action.findOne();
		prevQuery.table(Site.getActionTableName(site));
		prevQuery.where({id:visit.last_idaction});

		ch.nCall(prevQuery.exec, prevQuery);
	}

	ch.chain(function(_prevAction) {
		prevAction = _prevAction;

		var action = Action.createAction(data, visit, site);

		if (Action.isRepeat(prevAction, action)) {
			return null;
		}

		var query = Action.save(action, true);
		query.table(Site.getActionTableName(site));

		var ch = C.nCall(query.exec, query);

    if (action.type === Action.types.LISTING) {
      console.log('listing', data['tval']);
      /!*ch.chain(function(_action) {

      });*!/
    }

    return ch;
	});

	ch.chain(function(_action) {
		action = _action;

		if (!action) {
			return;
		}

		var update = {
			last_action_time:   action.time,
			last_idaction:      action.id,
			total_actions:      visit.total_actions+1
		};

		if (prevAction) {
      update.ref_duration = Math.floor((action.time - prevAction.time) / 1000);
		}
		else {
      update.first_idaction = action.id;
      update.ref_duration = 0;
		}

    if (data['user']) update.iduser = parseInt(data['user']);

		var query = Visit.update({id:visit.id}, update);
		query.table(Site.getVisitTableName(site));

		query.exec(cb);
	});

	ch.fail(cb);
};
*/

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

VisitSchema.statics.setConfig = function setConfig(visit, req, data) {
	var plugins = new Array(pluginMaskSize);

	var i = pluginMaskSize;

	while (--i) {
		plugins[i] = 0;
	}

	for( var p in pluginMap ) {
		if (data[p] === '1') {
			plugins[pluginMap[p]] = 1;
		}
	}

	// hash state
	var p = plugins.join(''),
		agent = useragent.parse(req.headers['user-agent']),
		ip = getIpFromReq(req),
		hs = MurmurHash3(p);

	hs.hash(ip);
	hs.hash(visit.config_os = agent.os.toString());
	hs.hash(visit.config_browser_name = agent.family);
	hs.hash(visit.config_browser_version = agent.toVersion());
  if (req.headers['accept-language']) hs.hash(visit.config_browser_lang = req.headers['accept-language']);
	hs.hash(visit.config_resolution = data['res']);

	visit.config_ip = Query.dontEscape('INET_ATON('+Query.escape(ip)+')');
	visit.config_plugins = Query.dontEscape("b'"+p+"'");

	visit.config_hash = hs.result();

//	var geo = geoip.lookup(ip);
//
//	if (geo) {
//		visit.config_country = geo.country;
//		visit.config_region = geo.region;
//		visit.config_city = geo.city;
//		visit.config_latitude = geo.ll[0];
//		visit.config_longitude = geo.ll[1];
//	}
};

VisitSchema.statics.getConfigHash = function getConfigHash(req, data) {
	var plugins = new Array(pluginMaskSize);

	var i = pluginMaskSize;

	while (--i) {
		plugins[i] = 0;
	}

	for( var p in pluginMap ) {
		if (data[p] === '1') {
			plugins[pluginMap[p]] = 1;
		}
	}

	// hash state
	var agent = useragent.parse(req.headers['user-agent']),
		ip = getIpFromReq(req),
		hs = MurmurHash3(plugins.join(''));

	hs.hash(ip);
	hs.hash(agent.os.toString());
	hs.hash(agent.family);
	hs.hash(agent.toVersion());
	if (req.headers['accept-language']) hs.hash(req.headers['accept-language']);
	hs.hash(data['res']);

  var result = hs.result();

  if (!result) console.error('hash empty', plugins, ip, req.headers['accept-language'], data['res']);

	return result;
};

function getIpFromReq(req) {
	var ip = req.headers['x-forwarded-for'];

	if (!ip) ip = req.connection.remoteAddress;

  ip = ip.split(',')[0].trim().match(/\D*(\d+\.\d+.\d+.\d+)/)[1];

  if(!ip) console.error('no ip', req.headers['x-forwarded-for'], req.connection.remoteAddress);

  return ip;
}

function getLanguageCodeFromReq(req) {
	var al = req.headers['accept-language'];

	if (!al) return '';

	var parsed = al.split(','),
		lan = [], q = [];

	var a, b, c;

	var bestI = 0;

	for( var i= 0, len=parsed.length; i<len; i++ ) {
		c = parsed[i].split(';');
		a = c[0].trim();
		b = parseFloat((c[1]||'1').trim());

		lan[i] = a;
		q[i] = b;

		if (q[i] > q[bestI]) bestI = i;
	}

	return lan[bestI];
}

function isMobile(req) {
	var ua = req.headers['user-agent'];

	return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(ua)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(ua.substr(0,4));
}

Visit = module.exports = db.model('Visit', VisitSchema);

