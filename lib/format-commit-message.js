'use strict';

const util = require('util');

module.exports = (msg, newVersion) => {
  if (String(msg).indexOf('%s') !== -1) {
    return util.format(msg, newVersion);
  }

  return msg;
};
