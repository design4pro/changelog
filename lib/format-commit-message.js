'use strict';

var util = require('util');

module.exports = function (msg, newVersion) {
  if (String(msg).indexOf('%s') !== -1) {
    return util.format(msg, newVersion);
  }

  return msg;
};
