console.log('minifying rf.js');

var uglify = require('uglify-js');
var fs = require('fs');

var result = uglify.minify('./public/rf.js');

try {
  fs.mkdirSync('./min', 0777);
}
catch(e) {
  if (e.code !== 'EEXIST') throw e;
}

fs.writeFileSync('./min/rf.js', result.code, 'utf-8');