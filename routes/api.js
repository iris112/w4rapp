var express = require('express');
var Site = require('../models/site');
var tool = require('../utils/tool');

var api = module.exports = express.Router();

api.get('/', function(req, res) {
  var query = req.query;
  var main_url = query.main_url;

  if (main_url) {
    var parsedUrl = tool.parseUrl(main_url);

    if (!parsedUrl) {
      return res.send(400, {error:"main_url must be a valid URL. " + main_url});
    }

    query.main_url = parsedUrl.url;
  }

  Site.findOne(query, function(err, site) {
    if (err) {
      console.log('site findOne err', err);
      return res.send(500, {error: err.message});
    }

    if (!site) return res.send(404);

    site.account = Site.intToAccountStr(site.account);

    res.json(site);
  });
});

api.post('/:id', function(req, res) {
  Site.update({id:req.params.id}, req.body, function(err, doc) {
    if (err) return res.send(500, err.message);

    res.json(doc);
  });
});

api.post('/', function(req, res) {
  var name = req.body.name,
    main_url = req.body.main_url;

  console.log('create', req.body);

  if (!name || !main_url) {
    return res.send(400, {error:'name and main_url are required.'});
  }

  var parsedUrl = tool.parseUrl(main_url);

  if (!parsedUrl) {
    return res.send(400, {error:"main_url must be a valid URL. " + main_url});
  }

  Site.createSite({
    name: name,
    main_url: parsedUrl.url,
    account: Site.hexToInt(tool.randHex(8)),
    created: new Date()
  }, function(err, site) {
    console.log('create cb', err, site);

    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log('duplicate detected... redirecting...');
        return res.redirect('/api/?main_url='+encodeURIComponent(parsedUrl.url));
      }

      return res.send(500, {error:err.message});
    }

    site.account = Site.intToAccountStr(site.account);

    res.json(site);
  });
});