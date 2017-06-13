'use strict';

var chalk = require('chalk');
var checkpoint = require('../checkpoint');
var figures = require('figures');
var formatCommitMessage = require('../format-commit-message');
var runExec = require('../run-exec');
var runScript = require('../run-script');

module.exports = function (newVersion, pkgPrivate, args) {
  if (args.skip.tag) {
    return Promise.resolve();
  }

  return runScript(args, 'pretag')
    .then(function () {
      return execTag(newVersion, pkgPrivate, args);
    })
    .then(function () {
      return runScript(args, 'posttag');
    });
};

function execTag(newVersion, pkgPrivate, args) {
  var tagOption;

  if (args.sign) {
    tagOption = '-s ';
  } else {
    tagOption = '-a ';
  }

  checkpoint(args, 'tagging release %s', [newVersion]);

  return runExec(args, 'git tag ' + tagOption + args.tagPrefix + newVersion + ' -m "' + formatCommitMessage(args.message, newVersion) + '"')
    .then(function () {
      var message = 'git push --follow-tags origin master';
      if (pkgPrivate !== true) message += '; npm publish';

      checkpoint(args, 'Run `%s` to publish', [message], chalk.blue(figures.info));
    });
}
