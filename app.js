
/**
 * Module dependencies..
 */

var express = require('express');
//var routes = require('./routes');
//var user = require('./routes/user');
var site = require('./routes/site');
var http = require('http');
var path = require('path');
var config = require('./config');

var app = express();

// all environments
app.set('port', config.get('port'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
//app.use(express.favicon());
//app.use(express.logger('dev'));
app.use(require('compression')());

if ( config.get('NODE_ENV') === 'production') {
  require('./minify');

  app.use(express.static(path.join(__dirname, 'min')));
}

app.use(express.static(path.join(__dirname, 'public')));

app.use('/visitor', require('./routes/visitor'));

var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;

passport.use(new BasicStrategy({realm:'Authorization Required'}, function(username, password, done) {
    let auth = config.get('auth');
    var result = username.valueOf() === auth.name && password.valueOf() === auth.pass;
    done(null, result);
}));

app.use(passport.initialize());

var _auth = passport.authenticate('basic', {session:false});
var basicAuth = function(_next) {
    return function(req, res, next) {
        _auth(req, res, function(err) {
            if (err) return next(err);

            _next(req, res, next);
        });
    };
};

var bodyParser = require('body-parser').urlencoded({extended:false});

app.use('/sites', _auth, bodyParser, site);
app.use('/api', _auth, bodyParser, require('./routes/api'));

var Tracker = require('./tracker');

var tracker = new Tracker(function(err) {
	if (err) {
		console.error('tracker error', err);
		return;
	}

	app.get(tracker.route, tracker.middleware.bind(tracker));

	http.createServer(app).listen(config.get('port'), function(){
		console.log('Express server listening on port ' + config.get('port'));
	});
  
  let options = config.get('https');
  if (options.keyPath && options.certPath) {
    let https = require('https');
    let fs = require('fs');
    const credentials = {
      key: fs.readFileSync(options.keyPath),
      cert: fs.readFileSync(options.certPath)
    };
    
    https.createServer(credentials, app).listen(config.get('httpsPort'), function() {
      console.log('Express server listening on port ' +config.get('httpsPort'));
    });
  }
});
