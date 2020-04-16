var Site = require('../models/site'),
	tool = require('../utils/tool'),
	nconf = require('nconf');

var sites = module.exports = require('express').Router();

exports.all = '/sites/:id?';

// ALL /sites/:id?

exports.handler = function(req, res, next) {
	console.log('site handler');
	var method = req.method,
		get = method === 'GET',
		id = req.params.id;

	if (!get && method !== 'POST') {
		console.log('unknown method', req.route.path, method);
		return next(new Error(405));
	}

	if (id) {
		return get ? view(req, res) : update(req, res);
	}
	else {
		return get ? list(req, res) : create(req, res);
	}
};

// GET /sites/
// List all sites.
// Create new site form.

sites.get('/', list);

function list(req, res) {
  if (req.query.account) {
    req.query.account = Site.accountStrToInt(req.query.account);
  }

  if (req.query.main_url) {
    req.query.main_url = tool.parseUrl(req.query.main_url).url;
  }

  for (var p in req.query) {
    if (!req.query[p]) delete req.query[p];
  }

	Site.find(req.query, function(err, results) {
		if (err) {
			console.log('sites find err', err);
			return res.send(500, {error: err.message});
		}

		for( var i= 0, len=results.length; i<len; i++ ) {
			results[i].account = Site.intToAccountStr(parseInt(results[i].account));
		}

		res.render('sites', {sites: results});
	});
}

// POST /sites/
// Create new site.
// Redirect to /sites/:id

sites.post('/', create);

function create(req, res) {
	var name = req.body.name,
		main_url = req.body.main_url;

	console.log('create', req.body);

	if (!name || !main_url) {
		return res.redirect('/sites/');
	}

	var parsedUrl = tool.parseUrl(main_url);

	if (!parsedUrl) {
		return res.send(400, {error:"Main URL must be a valid URL. " + main_url});
	}

	Site.createSite({
		name: name,
		main_url: parsedUrl.url,
		account: Site.hexToInt(tool.randHex(8)),
		created: new Date()
	}, function(err, site) {
		console.log('create cb', err, site);

		if (err || !site) {
      if (err && err.code==='ER_DUP_ENTRY') {
        Site.findOne({main_url:parsedUrl.url}, function(err, site) {
          console.log('find cb', err, site);
          if (err || !site) {
            return res.redirect('/sites/');
          }
          else res.redirect('/sites/'+site.id);
        });
      }
      else res.redirect('/sites/');
		}
    else res.redirect('/sites/'+site.id);
	});
}

// GET /sites/:id
// Show embed code and site data.
// Show form for changing data.

sites.get('/:id', view);

function view(req, res) {
	var id = req.params.id;

	Site.findOne({id:parseInt(id)}, function(err, site) {
		if (err) {
			console.log('site findOne err', err);
			return res.send(500, {error: err.message});
		}

		site.account = Site.intToAccountStr(site.account);

		res.render('site', {site:site, rfSrc:nconf.get('host')});
	});
}

// POST /sites/:id
// Update site data.
// Redirect to /sites/:id

sites.post('/:id', update);

function update(req, res) {

}