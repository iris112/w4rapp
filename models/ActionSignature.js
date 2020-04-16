var Model = require('./Model');

function ActionSignature() {

}

require('util').inherits(ActionSignature, Model);

ActionSignature.prototype.tableName = 'action_signature';
ActionSignature.prototype.columns = [
	'idactionsignature INTEGER UNSIGNED NOT NULL AUTO_INCREMENT',
	'hash INTEGER UNSIGNED NOT NULL',
	'url_prefix TINYINT UNSIGNED NULL',
	'type TINYINT UNSIGNED NULL',
	'value TEXT'
];
ActionSignature.prototype.indexes = [
	'PRIMARY KEY (idactionsignature)',
	'INDEX index_hash_url_prefix (hash, url_prefix)'
];

module.exports = ActionSignature;