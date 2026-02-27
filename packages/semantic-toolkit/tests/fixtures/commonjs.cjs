const path = require('path');

function helper(x) {
	return x + 1;
}

const utils = {
	format(text) {
		return text.trim();
	},
};

module.exports = {
	helper,
	utils,
};

exports.VERSION = '1.0.0';

module.exports.extra = function extra() {
	return 42;
};
