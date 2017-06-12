const chalk = require('chalk');
const checkpoint = require('../checkpoint');
const figures = require('figures');
const formatCommitMessage = require('../format-commit-message');
const runExec = require('../run-exec');
const runScript = require('../run-script');

module.exports = (newVersion, pkgPrivate, args) => {
  /* istanbul ignore if */
  if (args.skip.tag) {
    return Promise.resolve();
  }

  return runScript(args, 'pretag')
    .then(() => {
      return execTag(newVersion, pkgPrivate, args);
    })
    .then(() => {
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
    .then(() => {
      var message = 'git push --follow-tags origin master';
      if (pkgPrivate !== true) message += '; npm publish';

      checkpoint(args, 'Run `%s` to publish', [message], chalk.blue(figures.info));
    });
}