'use strict';

var path = require('path');
var printError = require('./lib/print-error');
var bump = require('./lib/lifecycles/bump');
var changelog = require('./lib/lifecycles/changelog');
var commit = require('./lib/lifecycles/commit');
var tag = require('./lib/lifecycles/tag');
var log = require('winston');

module.exports = function releaseMe(argv) {
  var defaults = require('./defaults');
  var pkg = {};
  try {
    pkg = require(path.resolve(
      process.cwd(),
      './package.json'
    ));
  } catch (err) {
    log.warn('no root package.json found');
  }
  var newVersion = pkg.version;
  var args = Object.assign({}, defaults, argv);

  return Promise.resolve()
    .then(function () {
      return bump(args, pkg);
    })
    .then(function (_newVersion) {
      // if bump runs, it calculaes the new version that we
      // should release at.
      if (_newVersion) {
        newVersion = _newVersion;
      }

      return changelog(args, newVersion);
    })
    .then(function () {
      return commit(args, newVersion);
    })
    .then(function () {
      return tag(newVersion, pkg.private, args);
    })
    .catch(function (err) {
      printError(args, err.message);

      throw err;
    });
};
