import conventionalRecommendedBump from 'conventional-recommended-bump';
import conventionalChangelog from 'conventional-changelog';
import config from '../../conventional-changelog-release-me/dist/index';
import path from 'path';

import chalk from 'chalk';
import figures from 'figures';
import { exec } from 'child_process';
import * as fs from 'fs';
import semver from 'semver';
import util from 'util';

import checkpoint from './lib/checkpoint';
import printError from './lib/print-error';
import runExec from './lib/run-exec';
import runScript from './lib/run-script';

function releaseMe(argv) {
    const pkgPath = path.resolve(process.cwd(), './package.json');
    const pkg = require(pkgPath);
    const defaults = require('./defaults');
    let newVersion = pkg.version;
    let scripts = argv.scripts || {};
    let args = Object.assign({}, defaults, argv);

    return runScript(args, 'prebump', null, scripts)
        .then((stdout) => {
            if (stdout && stdout.trim().length) args.releaseAs = stdout.trim();
            return bumpVersion(args.releaseAs);
        })
        .then((release) => {
            if (!args.firstRelease) {
                let releaseType = getReleaseType(args.prerelease, release.releaseType,
                    pkg.version);
                newVersion = semver.valid(releaseType) || semver.inc(pkg.version,
                    releaseType, args.prerelease);
                updateConfigs(args, newVersion);
            } else {
                checkpoint(args, 'skip version bump on first release', [],
                    chalk.red(figures.cross));
            }

            return runScript(args, 'postbump', newVersion, scripts);
        })
        .then(() => {
            return outputChangelog(args);
        })
        .then(() => {
            return runScript(args, 'precommit', newVersion, scripts);
        })
        .then((message) => {
            if (message && message.length) args.message = message;
            return commit(args, newVersion);
        })
        .then(() => {
            return tag(newVersion, pkg.private, args);
        })
        .catch((err) => {
            printError(args, err.message);
            throw err;
        });
}

/**
 * Attempt to update the version # in a collection of common config
 * files, e.g., package.json, bower.json.
 *
 * @param argv config object
 * @param newVersion version # to update to.
 * @return {string}
 */
let configsToUpdate = {};

function updateConfigs(args, newVersion) {
    configsToUpdate[path.resolve(process.cwd(), './package.json')] = false;
    configsToUpdate[path.resolve(process.cwd(), './bower.json')] = false;
    Object.keys(configsToUpdate).forEach((configPath) => {
        try {
            let stat = fs.lstatSync(configPath);
            if (stat.isFile()) {
                let config = require(configPath);
                let filename = path.basename(configPath);
                checkpoint(args, 'bumping version in ' + filename +
                    ' from %s to %s', [config.version, newVersion]);
                config.version = newVersion;
                fs.writeFileSync(configPath, JSON.stringify(config,
                    null, 2) + '\n', 'utf-8');
                // flag any config files that we modify the version # for
                // as having been updated.
                configsToUpdate[configPath] = true;
            }
        } catch (err) {
            if (err.code !== 'ENOENT') console.warn(err.message);
        }
    });
}

function getReleaseType (prerelease, expectedReleaseType, currentVersion) {
  if (isString(prerelease)) {
    if (isInPrerelease(currentVersion)) {
      if (shouldContinuePrerelease(currentVersion, expectedReleaseType) ||
        getTypePriority(getCurrentActiveType(currentVersion)) > getTypePriority(expectedReleaseType)
      ) {
        return 'prerelease';
      }
    }

    return 'pre' + expectedReleaseType;
  } else {
    return expectedReleaseType;
  }
}

function isString (val) {
  return typeof val === 'string';
}

/**
 * if a version is currently in pre-release state,
 * and if it current in-pre-release type is same as expect type,
 * it should continue the pre-release with the same type
 *
 * @param version
 * @param expectType
 * @return {boolean}
 */
function shouldContinuePrerelease (version, expectType) {
  return getCurrentActiveType(version) === expectType;
}

function isInPrerelease (version) {
  return Array.isArray(semver.prerelease(version));
}

let TypeList = ['major', 'minor', 'patch'].reverse();

/**
 * extract the in-pre-release type in target version
 *
 * @param version
 * @return {string}
 */
function getCurrentActiveType (version) {
  let typelist = TypeList;
  for (var i = 0; i < typelist.length; i++) {
    if (semver[typelist[i]](version)) {
      return typelist[i];
    }
  }
}

/**
 * calculate the priority of release type,
 * major - 2, minor - 1, patch - 0
 *
 * @param type
 * @return {number}
 */
function getTypePriority(type) {
  return TypeList.indexOf(type);
}

function bumpVersion(releaseAs, callback) {
  return new Promise((resolve, reject) => {
    if (releaseAs) {
      return resolve({
        releaseType: releaseAs
      });
    } else {
      conventionalRecommendedBump({
        preset: 'angular'
      }, (err, release) => {
        if (err) return reject(err);
        else return resolve(release);
      });
    }
  });
}

function outputChangelog(argv) {
  return new Promise((resolve, reject) => {
    createIfMissing(argv);
    const header = '# Change Log\n\n';
    let oldContent = fs.readFileSync(argv.infile, 'utf-8');
    // find the position of the last release and remove header:
    if (oldContent.indexOf('<a name=') !== -1) {
      oldContent = oldContent.substring(oldContent.indexOf('<a name='));
    }
    let content = '';
    let changelogStream = conventionalChangelog({
      config
    }, undefined, {
        merges: null
    })
      .on('error', (err) => {
        return reject(err);
      });

    changelogStream.on('data', (buffer) => {
      content += buffer.toString();
    });

    changelogStream.on('end', () => {
      checkpoint(argv, 'outputting changes to %s', [argv.infile]);
      fs.writeFileSync(argv.infile, header + '\n' + (content + oldContent).replace(/\n+$/, '\n'), 'utf-8');
      return resolve();
    });
  });
}

function commit(argv, newVersion) {
  let msg = 'committing %s';
  let args = [argv.infile];
  let verify = argv.verify === false || argv.n ? '--no-verify ' : '';
  let toAdd = '';
  // commit any of the config files that we've updated
  // the version # for.
  Object.keys(configsToUpdate).forEach(function (p) {
    if (configsToUpdate[p]) {
      msg += ' and %s';
      args.unshift(path.basename(p));
      toAdd += ' ' + path.relative(process.cwd(), p);
    }
  });
  checkpoint(argv, msg, args);
  return runExec(argv, 'git add' + toAdd + ' ' + argv.infile)
    .then(() => {
      return runExec(argv, 'git commit ' + verify + (argv.sign ? '-S ' : '') + (argv.commitAll ? '' : (argv.infile + toAdd)) + ' -m "' + formatCommitMessage(argv.message, newVersion) + '"')
    });
}

function formatCommitMessage(msg, newVersion) {
  return String(msg).indexOf('%s') !== -1 ? util.format(msg, newVersion) : msg;
}

function tag(newVersion, pkgPrivate, argv) {
  let tagOption;
  if (argv.sign) {
    tagOption = '-s ';
  } else {
    tagOption = '-a ';
  }
  checkpoint(argv, 'tagging release %s', [newVersion]);
  return runExec(argv, 'git tag ' + tagOption + argv.tagPrefix + newVersion + ' -m "' + formatCommitMessage(argv.message, newVersion) + '"')
    .then(() => {
      let message = 'git push --follow-tags origin master';
      if (pkgPrivate !== true) message += '; npm publish';

      checkpoint(argv, 'Run `%s` to publish', [message], chalk.blue(figures.info));
    });
}

function createIfMissing(argv) {
  try {
    fs.accessSync(argv.infile, fs.F_OK);
  } catch (err) {
    if (err.code === 'ENOENT') {
      checkpoint(argv, 'created %s', [argv.infile]);
      argv.outputUnreleased = true;
      fs.writeFileSync(argv.infile, '\n', 'utf-8');
    }
  }
}

export default releaseMe;
