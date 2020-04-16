/**
 * Created by ofShard on 6/1/2016.
 */

function hexToInt(str) {
  var int = parseInt(flipHex(str), 16);
  return int;
}

function accountStrToInt(str) {
  if (!str) return false;

  if (!str.match(/^SA-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}$/)) {
    return false;
  }

  return hexToInt(str.replace('SA-', '').replace('-', ''));
}

function flipHex(hex) {
  var s = new Array(8);
  for (var i=0; i<hex.length; i+=2) {
    s[i] = hex[hex.length-(i+2)];
    s[i+1] = hex[hex.length-(i+1)];
  }
  return s.join('');
}

function intToAccountStr(int) {
  var int = parseInt(int, 10);

  var hex = flipHex(int.toString(16).toUpperCase());

  return 'SA-'+hex.substr(0, 4)+'-'+hex.substr(4,8);
}

$(function() {
  $('#convert-integer').on('keyup change', function(ev){
    $('#convert-ID').val(intToAccountStr(this.value));
  });
  $('#convert-ID').on('keyup change', function(ev){
    $('#convert-integer').val(accountStrToInt(this.value));
  });
});