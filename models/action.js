var db = require('../db'),
	Schema = db.Schema,
	Site = require('./site'),
	tool = require('../utils/tool'),
	mysql = require('mysql'),
	Query = db.Query,
    urlParse = require('url').parse;

var Action;

var ActionSchema = new Schema({
	id:             'INTEGER UNSIGNED NOT NULL AUTO_INCREMENT',
	idsite:         'INTEGER UNSIGNED NOT NULL',
	idvisitor:      'INTEGER UNSIGNED NOT NULL',
	idvisit:        'INTEGER UNSIGNED NOT NULL',
	time:           'DATETIME NOT NULL',
	type:           'TINYINT UNSIGNED NOT NULL',
	hash:           'INTEGER UNSIGNED NOT NULL', // Points to ActionSignature, which contains type, etc.
	url:            'VARCHAR(255) DEFAULT NULL',
	url_prefix:     'TINYINT UNSIGNED NULL', // Urls are normalized to remove protocol (http://) and www., which is stored.
	name:           'VARCHAR(255) DEFAULT NULL',
	ref_hash:       'INTEGER UNSIGNED NULL', // Points to ActionSignature of reference action.
	ref_url:        'VARCHAR(255) DEFAULT NULL',
	ref_url_prefix: 'TINYINT UNSIGNED NULL',
	ref_duration:   'SMALLINT UNSIGNED DEFAULT 0', // Duration of reference action.
	cat_hash:       'INTEGER UNSIGNED DEFAULT 0',
	cat_name:       'VARCHAR(255) DEFAULT NULL',
	custom_k1:      'VARCHAR(255) DEFAULT NULL',
	custom_v1:      'VARCHAR(255) DEFAULT NULL',
	custom_float:   'FLOAT NULL DEFAULT NULL' // page generation time, etc.
});

ActionSchema.indexes = [
	'PRIMARY KEY (id)',
	'INDEX index_idvisit_time (idvisit, time)',
	'INDEX index_idsite_time_refhash_hash (idsite, time, ref_hash, hash)'
];

ActionSchema.statics.noDefaultTable = true;

ActionSchema.statics.onLoad = function onLoad(cb) {
	//return cb();

	process.nextTick(function() {
		Site = require('./site');
		Site.onReady(cb);
	});
};

var types = {
	PAGEVIEW:   1,
	OUTLINK:    2,
	DOWNLOAD:   3,
	EVENT:      4,
  LISTING:    6,
  BLOG:       7
};
ActionSchema.statics.types = types;

ActionSchema.statics.createAction = function createAction(data, view, site) {
	var type = 1*data['tty'];

	if (type === types.PAGEVIEW) {
		return Action.createPageview(data, view, site);
	}
	else if (type === types.OUTLINK) {
		return Action.createOutlink(data, view, site);
	}
	else if (type === types.DOWNLOAD) {
		return Action.createDownload(data, view, site);
	}
	else if (type === types.EVENT) {
		return Action.createEvent(data, view, site);
	}
  else if (type === types.LISTING) {
    return Action.createListing(data, view, site);
  }
  else if (type === types.BLOG) {
    return Action.createBlog(data, view, site);
  }

	throw new Error('Unknown action type '+type+'.');
};

ActionSchema.statics.createListing = function createListing(data, view, site) {
  var action = Action.createPageview(data, view, site);

  action.type = types.LISTING;

  return action;
};

ActionSchema.statics.createBlog = function createBlog(data, view, site) {
  var action = Action.createPageview(data, view, site);

  action.type = types.BLOG;

  return action;
};

ActionSchema.statics.createPageview = function createPageview(data, view, site) {
	var url = tool.parseUrl(data.page),
		ref_url = tool.parseUrl(data['tref']),
		now = new Date(),
		dur = Math.floor((now - view.last_action_time) / 1000);

    var fixedUrl = url.url,
        fixedRef = ref_url.url;

    if (fixedUrl && fixedUrl.indexOf(site.main_url) === 0) fixedUrl = urlParse(data.page).path;
    if (fixedRef && fixedRef.indexOf(site.main_url) === 0) fixedRef = urlParse(data['tref']).path;

	if (dur < 0) dur = 0;

	var action = new Action({
		idsite:         site.id,
		idvisitor:      view.idvisitor,
		idvisit:        view.id,
		type:           types.PAGEVIEW,
		time:           now,
		hash:           Query.dontEscape('CRC32('+Query.escape(fixedUrl)+')'),
		url:            fixedUrl,
		url_prefix:     url.prefix,
		name:           data['tna'],
		ref_hash:       Query.dontEscape('CRC32('+Query.escape(fixedRef)+')'),
		ref_url:        fixedRef,
		ref_url_prefix: ref_url.prefix,
		ref_duration:   dur
	});

  if (data.cat) {
    action.cat_hash = Query.dontEscape('CRC32('+Query.escape(data.cat)+')');
    action.cat_name = data.cat;
  }

  if (data.k1 && data.v1) {
    action.custom_k1 = data.k1;
    action.custom_v1 = data.v1;
  }

	return action;
};

ActionSchema.statics.createOutlink = function createLink(data, view, site) {
	var url = tool.parseUrl(data['tval']),
		ref_url = tool.parseUrl(data.page),
		now = new Date(),
		dur = Math.floor((now - view.last_action_time) / 1000);

	if (dur < 0) dur = 0;

	var action = new Action({
		idsite:         site.id,
		idvisitor:      view.idvisitor,
		idvisit:        view.id,
		type:           types.OUTLINK,
		time:           now,
		hash:           Query.dontEscape('CRC32('+Query.escape(url.url)+')'),
		url:            url.url,
		url_prefix:     url.prefix,
		ref_hash:       Query.dontEscape('CRC32('+Query.escape(ref_url.url)+')'),
		ref_url:        ref_url.url,
		ref_url_prefix: ref_url.prefix,
		ref_duration:   dur
	});

	return action;
};

ActionSchema.statics.createDownload = function createLink(data, view, site) {
	var url = tool.parseUrl(data['tval']),
		ref_url = tool.parseUrl(data.page),
		now = new Date(),
		dur = Math.floor((now - view.last_action_time) / 1000);

	if (dur < 0) dur = 0;

	var action = new Action({
		idsite:         site.id,
		idvisitor:      view.idvisitor,
		idvisit:        view.id,
		type:           types.DOWNLOAD,
		time:           now,
		hash:           Query.dontEscape('CRC32('+Query.escape(url.url)+')'),
		url:            url.url,
		url_prefix:     url.prefix,
		ref_hash:       Query.dontEscape('CRC32('+Query.escape(ref_url.url)+')'),
		ref_url:        ref_url.url,
		ref_url_prefix: ref_url.prefix,
		ref_duration:   dur
	});

	return action;
};

ActionSchema.statics.createEvent = function createEvent(data, view, site) {
	var ref_url = tool.parseUrl(data.page),
		now = new Date(),
		dur = Math.floor((now - view.last_action_time) / 1000);

	if (dur < 0) dur = 0;

	var action = new Action({
		idsite:         site.id,
		idvisitor:      view.idvisitor,
		idvisit:        view.id,
		type:           types.EVENT,
		time:           now,
		hash:           Query.dontEscape('CRC32('+Query.escape(data['eact'])+')'),
		url:            data['eact'],
		ref_hash:       Query.dontEscape('CRC32('+Query.escape(ref_url.url)+')'),
		ref_url:        ref_url.url,
		ref_url_prefix: ref_url.prefix,
		ref_duration:   dur,
		cat_hash:       Query.dontEscape('CRC32('+Query.escape(data['ecat'])+')'),
		cat_name:       data['ecat']
	});

	if (data['enam']) {
		action.name = data['enam'];
	}

	if (data['eval']) {
		action.custom_float = 1*data['eval'];
	}

	return action;
};

ActionSchema.statics.isRepeat = function isRepeat(prevAction, action) {
	if (!prevAction || prevAction.type !== action.type) {
		return false;
	}

	return prevAction.url === action.url;
};

Action = module.exports = db.model('Action', ActionSchema);

// This query sorts entry actions by greatest frequency.
// SELECT hash, count(*) FROM actions WHERE time >= DATE_SUB(NOW(), 30 DAYS) AND ref_hash=NULL GROUP BY hash ORDER BY count(*) DESC LIMIT 10

// This query sorts actions by greatest frequency where hash is a previous action.
// SELECT hash, count(*) FROM actions WHERE time >= DATE_SUB(NOW(), 30 DAYS) AND ref_hash=prev_hash GROUP BY hash ORDER BY count(*) DESC LIMIT 4