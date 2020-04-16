var forever = require('forever-monitor');

var child = new (forever.Monitor)('app.js', {
  command: 'nodemon',
  options: ['--exitcrash', '--ignore', './min'],
  errFile: '../err.log',
  logFile: '../forever.log',
  outFile: '../out.log'
});

child.start();