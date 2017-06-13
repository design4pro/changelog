const accessSync = require('fs-access').sync;
const chalk = require('chalk');
const checkpoint = require('../checkpoint');
const conventionalChangelog = require('conventional-changelog');
const conventionalChangelogReleaseMe = require('conventional-changelog-release-me');
const fs = require('fs');
const runScript = require('../run-script');
const writeFile = require('../write-file');

module.exports = (args, newVersion) => {
  if (args.skip.changelog) {
    return Promise.resolve();
  }

  return runScript(args, 'prechangelog')
    .then(() => {
      return outputChangelog(args, newVersion);
    })
    .then(() => {
      return runScript(args, 'postchangelog');
    });
};

function outputChangelog(args, newVersion) {
  return new Promise((resolve, reject) => {
    createIfMissing(args);
    let header = '# Change Log\n';
    let oldContent = args.dryRun ? '' : fs.readFileSync(args.infile, 'utf-8');
    // find the position of the last release and remove header:
    if (oldContent.indexOf('<a name=') !== -1) {
      oldContent = oldContent.substring(oldContent.indexOf('<a name='));
    }
    let content = '';
    let context;

    if (args.dryRun) {
      context = {
        version: newVersion
      };
    }

    let changelogStream = conventionalChangelog({
      conventionalChangelogReleaseMe
    }, context, {merges: null})
      .on('error', (err) => {
        return reject(err);
      });

    changelogStream.on('data', (buffer) => {
      content += buffer.toString();
    });

    changelogStream.on('end', () => {
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
