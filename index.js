'use strict';

const path = require('path');
const printError = require('./lib/print-error');

const bump = require('./lib/lifecycles/bump');
const changelog = require('./lib/lifecycles/changelog');
const commit = require('./lib/lifecycles/commit');
const tag = require('./lib/lifecycles/tag');

let log = require('winston');

module.exports = function releaseMe(argv) {
  const defaults = require('./defaults');
  let pkg = {};
  try {
    pkg = require(path.resolve(
      process.cwd(),
      './package.json'
    ));
  } catch (err) {
    /* istanbul ignore next */
    log.warn('no root package.json found');
  }
  let newVersion = pkg.version;
  let args = Object.assign({}, defaults, argv);

  return Promise.resolve()
    .then(() => {
      return bump(args, pkg);
    })
    .then((_newVersion) => {
      // if bump runs, it calculaes the new version that we
      // should release at.
      /* istanbul ignore if */
      if (_newVersion) {
        newVersion = _newVersion;
      }

      return changelog(args, newVersion);
    })
    .then(() => {
      return commit(args, newVersion);
    })
    .then(() => {
      return tag(newVersion, pkg.private, args);
    })
    .catch((err) => {
      printError(args, err.message);
      throw err;
    });
};
