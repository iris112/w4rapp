var express = require('express'),
  Visit = require('../models/visit'),
  Site = require('../models/site');

var visitor = module.exports = express.Router();

visitor.get('/', function(req, res) {
  var query = req.query;

  Site = require('../models/site');

  Site.getByAccount(query['si'], function(err, site) {
    if (err || !site) {
      if (err) {
        console.error('visitor error: while retrieving site '+query['si'], err);
        return res.jsonp({error:err.message});
      }
      else {
        console.error('visitor error: invalid site id '+query['si']);
        return res.jsonp({error:'invalid site id'});
      }
    }

    Visit.getCurrentVisit(req, query, site, function(err, visit) {
      if (err || !visit) {
        if (err) {
          console.error('visitor error: while retrieving idvisitor '+query['idv'], err, query);
          return res.jsonp({error:err.message});
        }
        else {
          console.log('visitor '+query['idv']+' for '+site.main_url+' not found or expired');
          return res.jsonp({error:'unknown visitor'});
        }
      }

      res.jsonp({id:visit.idvisitor.toString(16), returning:!!visit.returning, count:visit.count_visits});
    });
  });
});