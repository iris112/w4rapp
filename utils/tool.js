var util = require('util');
var urlParse = require('url').parse;
var Promise = require('bluebird');

exports.randHex = function randHex(length) {
	if (typeof length === 'undefined') length = 8;

	var r,
		str = '';

	for( var i=0; i<length; i++ ) {
		r = Math.random()*16|0;
		str += r.toString(16);
	}

	return str;
};

var url_prefix = exports.URL_PREFIX = ['', 'http://', 'http://www.', 'https://', 'https://www.'];
url_prefix['http://'] =         1;
url_prefix['http://www.'] =     2;
url_prefix['https://'] =        3;
url_prefix['https://www.'] =    4;

exports.parseUrl = function parseUrl(urlStr) {
  if (!urlStr) return false;

  if (!~urlStr.indexOf('://')) urlStr = 'http://'+urlStr;

	var parsedUrl = urlParse(urlStr),
		host = parsedUrl.hostname,
		proto = parsedUrl.protocol,
		prefix = 0;

	if (!host) {
		return false;
	}

	if (proto === 'http:') {
		prefix = 1;
	}
	else if (proto === 'https:') {
		prefix = 3;
	}

	if (host.indexOf('www.') === 0) {
		prefix++;
		host = host.replace('www.', '');
	}

	if (host !== 'localhost' && !~host.indexOf('.')) {
		return false;
	}

	var url = parsedUrl.href;

	if (prefix) {
		url = url.replace(url_prefix[prefix], '');
	}

	return {url:url, prefix:prefix};
};

exports.urlFrom = function urlFrom(testUrl, mainUrl) {
	var parsedUrl = exports.parseUrl(testUrl);

	return parsedUrl.url.indexOf(mainUrl) === 0;
};

exports.getRequestParams = function getRequestParams() {

};

function VisitError(message) {
    Error.captureStackTrace(this, arguments.callee);
    this.message = message;
}

util.inherits(VisitError, Error);

exports.VisitError = VisitError;

exports.coroutine = function(genFunc, options) {
	let numArgs = genFunc.length;
	let func = Promise.coroutine(genFunc);
	return function() {
		func.apply(this, Array.prototype.slice.call(arguments, 0, numArgs-1)).asCallback(Array.prototype.slice.call(arguments, numArgs-1, numArgs));
	}
};