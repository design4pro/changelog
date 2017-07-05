'use strict';

var accessSync = require('fs-access').sync;
var chalk = require('chalk');
var checkpoint = require('../checkpoint');
var conventionalChangelogCore = require('conventional-changelog-core');
var conventionalChangelogReleaseMe = require('conventional-changelog-release-me');
var fs = require('fs');
var runScript = require('../run-script');
var writeFile = require('../write-file');

module.exports = function (args, newVersion) {
  if (args.skip.changelog) {
    return Promise.resolve();
  }

  return runScript(args, 'prechangelog')
    .then(function () {
      return outputChangelog(args, newVersion);
    })
    .then(function () {
      return runScript(args, 'postchangelog');
    });
};

function outputChangelog(args, newVersion) {
  return new Promise(function (resolve, reject) {
    createIfMissing(args);
    var header = '# Change Log\n';
    var oldContent = args.dryRun || !args.releaseCount ? '' : fs.readFileSync(args.infile, 'utf-8');
    // find the position of the last release and remove header:
    if (oldContent.indexOf('<a name=') !== -1) {
      oldContent = oldContent.substring(oldContent.indexOf('<a name='));
    }

    var content = '';
    var context;

    if (args.dryRun) {
      context = {
        version: newVersion
      };
    }

    var changelogStream = conventionalChangelogCore({
      config: conventionalChangelogReleaseMe,
      releaseCount: args.releaseCount
    }, context, { merges: null })
      .on('error', function (err) {
        return reject(err);
      });

    changelogStream.on('data', function (buffer) {
      content += buffer.toString();
    });

    changelogStream.on('end', function () {
      checkpoint(args, 'outputting changes to %s', [args.infile]);

      if (args.dryRun) {
        console.info(`\n---\n${chalk.gray(content.trim())}\n---\n`);
      } else {
        writeFile(args, args.infile, header + '\n' + (content + oldContent).replace(/\n+$/, '\n'));
      }

      return resolve();
    });
  });
}

function createIfMissing(args) {
  try {
    accessSync(args.infile, fs.F_OK);
  } catch (err) {
    if (err.code === 'ENOENT') {
      checkpoint(args, 'created %s', [args.infile]);
      args.outputUnreleased = true;
      writeFile(args, args.infile, '\n');
    }
  }
}
