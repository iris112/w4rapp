var nconf = require('nconf');

nconf.argv().env().file({file:'config/config.json'}).defaults({
	db: {
		host: 'example.org',
		port: '3306',
		user: 'root',
		password: 'secret',
		name: 'realfind',
		tablePrefix: 'rf_'
	},
	auth: {
		name: 'w4rapp',
		pass: 'AsrkSC699vFCYQqL'
	},
	https: {
		keyPath:'',
		certPath:''
	},
	route: '/im.gif',
	port: 3000,
	httpsPort: 3443
});

module.exports = nconf;