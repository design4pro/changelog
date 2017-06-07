/* global describe it beforeEach afterEach */

'use strict';

import shell from 'shelljs';
import fs from 'fs';
import path from 'path';
import mockGit from 'mock-git';
import gitDummyCommit from 'git-dummy-commit';
import debug from 'debug';
import semver from 'semver';
import cli from '../dist/command';
import releaseMe from '../dist/index';
import { should, expect } from 'chai';
should();

const log = debug('mocha');
const cliPath = path.resolve(__dirname, '../dist/cli.js');

function branch(branch) {
    shell.exec('git branch ' + branch);
}

function checkout(branch) {
    shell.exec('git checkout ' + branch);
}

function merge(msg, branch) {
    shell.exec('git merge --no-ff -m"' + msg + '" ' + branch);
}

function execCli(argString) {
    return shell.exec('node ' + cliPath + (argString !== null ? ' ' + argString : ''));
}

function execCliAsync(argString) {
    return releaseMe(cli.parse('release-me ' + argString + ' --silent'));
}

function writePackageJson(version, option) {
    option = option || {};
    let pkg = Object.assign(option, {
        version: version
    });
    fs.writeFileSync('package.json', JSON.stringify(pkg), 'utf-8');
    delete require.cache[require.resolve(path.join(process.cwd(), 'package.json'))];
}

function writeBowerJson(version, option) {
    option = option || {};
    let bower = Object.assign(option, {
        version: version
    });
    fs.writeFileSync('bower.json', JSON.stringify(bower), 'utf-8');
}

function writeGitPreCommitHook() {
    fs.writeFileSync('.git/hooks/pre-commit', '#!/bin/sh\necho "precommit ran"\nexit 1', 'utf-8');
    fs.chmodSync('.git/hooks/pre-commit', '755');
}

function initInTempFolder() {
    shell.rm('-rf', 'tmp');
    shell.config.silent = true;
    shell.mkdir('tmp');
    shell.cd('tmp');
    shell.exec('git init');

    gitDummyCommit('root-commit');
    writePackageJson('1.0.0');
}

function finishTemp() {
    shell.cd('../');
    shell.rm('-rf', 'tmp');
}

function getPackageVersion() {
    return JSON.parse(fs.readFileSync('package.json', 'utf-8')).version;
}

describe('cli', () => {
    beforeEach(initInTempFolder);
    afterEach(finishTemp);

    describe('CHANGELOG.md does not exist', () => {
        it('populates changelog with commits since last tag by default', () => {
            gitDummyCommit('feat: first commit');
            shell.exec('git tag -a v1.0.0 -m "my awesome first release"');
            gitDummyCommit('fix: patch release');

            execCli().code.should.equal(0);

            let content = fs.readFileSync('CHANGELOG.md', 'utf-8');
            content.should.match(/patch release/);
            content.should.not.match(/first commit/);
        });

        it('includes all commits if --first-release is true', () => {
            writePackageJson('1.0.1');

            gitDummyCommit('feat: first commit');
            gitDummyCommit('fix: patch release');

            execCli('--first-release').code.should.equal(0);

            let content = fs.readFileSync('CHANGELOG.md', 'utf-8');
            content.should.match(/patch release/);
            content.should.match(/first commit/);

            shell.exec('git tag').stdout.should.match(/1\.0\.1/);
        });
    });

    describe('CHANGELOG.md exists', () => {
        it('appends the new release above the last release, removing the old header', () => {
            fs.writeFileSync('CHANGELOG.md', 'legacy header format<a name="1.0.0">\n', 'utf-8');

            gitDummyCommit('feat: first commit');
            shell.exec('git tag -a v1.0.0 -m "my awesome first release"');
            gitDummyCommit('fix: patch release');

            execCli().code.should.equal(0);

            let content = fs.readFileSync('CHANGELOG.md', 'utf-8');
            content.should.match(/1\.0\.1/);
            content.should.not.match(/legacy header format/);
        });

        it('commits all staged files', () => {
            fs.writeFileSync('CHANGELOG.md', 'legacy header format<a name="1.0.0">\n', 'utf-8');

            gitDummyCommit('feat: first commit');
            shell.exec('git tag -a v1.0.0 -m "my awesome first release"');
            gitDummyCommit('fix: patch release');

            fs.writeFileSync('STUFF.md', 'stuff\n', 'utf-8');

            shell.exec('git add STUFF.md');

            execCli('--commit-all').code.should.equal(0);

            let content = fs.readFileSync('CHANGELOG.md', 'utf-8');
            let status = shell.exec('git status --porcelain'); // see http://unix.stackexchange.com/questions/155046/determine-if-git-working-directory-is-clean-from-a-script

            status.should.equal('');
            status.should.not.match(/STUFF.md/);

            content.should.match(/1\.0\.1/);
            content.should.not.match(/legacy header format/);
        });
    });

    describe('with mocked git', () => {
        it('--sign signs the commit and tag', () => {
            // mock git with file that writes args to gitcapture.log
            return mockGit('require("fs").appendFileSync("gitcapture.log", JSON.stringify(process.argv.splice(2)) + "\\n")')
                .then((unmock) => {
                    execCli('--sign').code.should.equal(0);

                    let captured = shell.cat('gitcapture.log').stdout.split('\n').map((line) => {
                        return line ? JSON.parse(line) : line;
                    });

                    captured[captured.length - 3].should.deep.equal(['commit', '-S', 'CHANGELOG.md', 'package.json', '-m', 'chore(release): 1.0.1']);
                    captured[captured.length - 2].should.deep.equal(['tag', '-s', 'v1.0.1', '-m', 'chore(release): 1.0.1']);

                    unmock();
                });
        });

        it('exits with error code if git commit fails', () => {
            // mock git by throwing on attempt to commit
            return mockGit('console.error("commit yourself"); process.exit(128);', 'commit')
                .then((unmock) => {
                    let result = execCli();

                    result.code.should.equal(1);
                    result.stderr.should.match(/commit yourself/);

                    unmock();
                });
        });

        it('exits with error code if git add fails', () => {
            // mock git by throwing on attempt to add
            return mockGit('console.error("addition is hard"); process.exit(128);', 'add')
                .then((unmock) => {
                    let result = execCli();

                    result.code.should.equal(1);
                    result.stderr.should.match(/addition is hard/);

                    unmock();
                });
        });

        it('exits with error code if git tag fails', () => {
            // mock git by throwing on attempt to commit
            return mockGit('console.error("tag, you\'re it"); process.exit(128);', 'tag')
                .then((unmock) => {
                    let result = execCli();

                    result.code.should.equal(1);
                    result.stderr.should.match(/tag, you're it/);

                    unmock();
                });
        });

        it('doesn\'t fail fast on stderr output from git', () => {
            // mock git by throwing on attempt to commit
            return mockGit('console.error("haha, kidding, this is just a warning"); process.exit(0);', 'add')
                .then((unmock) => {
                    writePackageJson('1.0.0');

                    var result = execCli();

                    result.code.should.equal(0);
                    result.stderr.should.match(/haha, kidding, this is just a warning/);

                    unmock();
                });
        });
    });

    describe('pre-release', () => {
        it('works fine without specifying a tag id when prereleasing', () => {
            writePackageJson('1.0.0');
            fs.writeFileSync('CHANGELOG.md', 'legacy header format<a name="1.0.0">\n', 'utf-8');

            gitDummyCommit('feat: first commit');
            return execCliAsync('--prerelease')
                .then(() => {
                    // it's a feature commit, so it's minor type
                    expect(getPackageVersion()).to.equal('1.1.0-0');
                });
        });
    });

    describe('manual-release', () => {
        it('throws error when not specifying a release type', () => {
            writePackageJson('1.0.0');
            fs.writeFileSync('CHANGELOG.md', 'legacy header format<a name="1.0.0">\n', 'utf-8');

            gitDummyCommit('fix: first commit');
            execCli('--release-as').code.should.above(0);
        });

        describe('release-types', () => {
            const regularTypes = ['major', 'minor', 'patch'];

            regularTypes.forEach((type) => {
                it('creates a ' + type + ' release', () => {
                    const ORIGIN_VER = '1.0.0';
                    writePackageJson(ORIGIN_VER);
                    fs.writeFileSync('CHANGELOG.md', 'legacy header format<a name="1.0.0">\n', 'utf-8');

                    gitDummyCommit('fix: first commit');

                    return execCliAsync('--release-as ' + type)
                        .then(() => {
                            let version = {
                                major: semver.major(ORIGIN_VER),
                                minor: semver.minor(ORIGIN_VER),
                                patch: semver.patch(ORIGIN_VER)
                            };

                            version[type] += 1;

                            getPackageVersion().should.equal(version.major + '.' + version.minor + '.' + version.patch);
                        });
                });
            });

            // this is for pre-releases
            regularTypes.forEach(function (type) {
                it('creates a pre' + type + ' release', () => {
                    const ORIGIN_VER = '1.0.0';
                    writePackageJson(ORIGIN_VER);
                    fs.writeFileSync('CHANGELOG.md', 'legacy header format<a name="1.0.0">\n', 'utf-8');

                    gitDummyCommit('fix: first commit');

                    return execCliAsync('--release-as ' + type + ' --prerelease ' + type)
                        .then(() => {
                            let version = {
                                major: semver.major(ORIGIN_VER),
                                minor: semver.minor(ORIGIN_VER),
                                patch: semver.patch(ORIGIN_VER)
                            };

                            version[type] += 1;

                            getPackageVersion().should.equal(version.major + '.' + version.minor + '.' + version.patch + '-' + type + '.0');
                        });
                });
            });
        });

        describe('release-as-exact', () => {
            it('releases as v100.0.0', () => {
                const ORIGIN_VER = '1.0.0';
                writePackageJson(ORIGIN_VER);
                fs.writeFileSync('CHANGELOG.md', 'legacy header format<a name="1.0.0">\n', 'utf-8');

                gitDummyCommit('fix: first commit');

                return execCliAsync('--release-as v100.0.0')
                    .then(() => {
                        getPackageVersion().should.equal('100.0.0');
                    });
            });

            it('releases as 200.0.0-amazing', () => {
                const ORIGIN_VER = '1.0.0';
                writePackageJson(ORIGIN_VER);
                fs.writeFileSync('CHANGELOG.md', 'legacy header format<a name="1.0.0">\n', 'utf-8');

                gitDummyCommit('fix: first commit');

                return execCliAsync('--release-as 200.0.0-amazing')
                    .then(() => {
                        getPackageVersion().should.equal('200.0.0-amazing');
                    });
            });
        });

        it('creates a prerelease with a new minor version after two prerelease patches', () => {
            writePackageJson('1.0.0');
            fs.writeFileSync('CHANGELOG.md', 'legacy header format<a name="1.0.0">\n', 'utf-8');

            gitDummyCommit('fix: first patch');
            return execCliAsync('--release-as patch --prerelease dev')
                .then(() => {
                    getPackageVersion().should.equal('1.0.1-dev.0');
                })

                // second
                .then(() => {
                    gitDummyCommit('fix: second patch');

                    return execCliAsync('--prerelease dev');
                })
                .then(() => {
                    getPackageVersion().should.equal('1.0.1-dev.1');
                })

                // third
                .then(() => {
                    gitDummyCommit('feat: first new feat');

                    return execCliAsync('--release-as minor --prerelease dev');
                })
                .then(() => {
                    getPackageVersion().should.equal('1.1.0-dev.0');
                })

                .then(() => {
                    gitDummyCommit('fix: third patch');

                    return execCliAsync('--release-as minor --prerelease dev');
                })
                .then(() => {
                    getPackageVersion().should.equal('1.1.0-dev.1');
                })

                .then(() => {
                    gitDummyCommit('fix: forth patch');

                    return execCliAsync('--prerelease dev');
                })
                .then(() => {
                    getPackageVersion().should.equal('1.1.0-dev.2');
                });
        });
    });

    it('handles commit messages longer than 80 characters', () => {
        gitDummyCommit('feat: first commit');
        shell.exec('git tag -a v1.0.0 -m "my awesome first release"');
        gitDummyCommit('fix: this is my fairly long commit message which is testing whether or not we allow for long commit messages');

        execCli().code.should.equal(0);

        let content = fs.readFileSync('./CHANGELOG.md', 'utf-8');
        content.should.match(/this is my fairly long commit message which is testing whether or not we allow for long commit messages/);
    });

    it('formats the commit and tag messages appropriately', () => {
        gitDummyCommit('feat: first commit');
        shell.exec('git tag -a v1.0.0 -m "my awesome first release"');
        gitDummyCommit('feat: new feature!');

        execCli().code.should.equal(0);

        // check last commit message
        shell.exec('git log --oneline -n1').stdout.should.match(/chore\(release\): 1\.1\.0/);
        // check annotated tag message
        shell.exec('git tag -l -n1 v1.1.0').stdout.should.match(/chore\(release\): 1\.1\.0/);
    });

    it('appends line feed at end of package.json', () => {
        execCli().code.should.equal(0);

        let pkgJson = fs.readFileSync('package.json', 'utf-8');
        pkgJson.should.equal(['{', '  "version": "1.0.1"', '}', ''].join('\n'));
    });

    it('does not run git hooks if the --no-verify flag is passed', () => {
        writeGitPreCommitHook();

        gitDummyCommit('feat: first commit');
        execCli('--no-verify').code.should.equal(0);

        gitDummyCommit('feat: second commit');
        execCli('-n').code.should.equal(0);
    });

    it('does not print output when the --silent flag is passed', () => {
        let result = execCli('--silent');

        result.code.should.equal(0);
        result.stdout.should.equal('');
        result.stderr.should.equal('');
    });

    it('does not display `npm publish` if the package is private', () => {
        writePackageJson('1.0.0', {
            private: true
        });

        let result = execCli();

        result.code.should.equal(0);
        result.stdout.should.not.match(/npm publish/);
    });

    it('includes merge commits', () => {
        const BRANCH_NAME = 'new-feature';
        gitDummyCommit('feat: first commit');
        shell.exec('git tag -a v1.0.0 -m "my awesome first release"');
        branch(BRANCH_NAME);
        checkout(BRANCH_NAME);
        gitDummyCommit('Implementing new feature');
        checkout('master');
        merge('feat: new feature from branch', BRANCH_NAME);

        execCli().code.should.equal(0);

        let content = fs.readFileSync('CHANGELOG.md', 'utf-8');
        content.should.match(/new feature from branch/);

        let pkgJson = fs.readFileSync('package.json', 'utf-8');
        pkgJson.should.equal(['{', '  "version": "1.1.0"', '}', ''].join('\n'));
    });
});

describe('releaseMe', () => {
    beforeEach(initInTempFolder);
    afterEach(finishTemp);

    it('formats the commit and tag messages appropriately', (done) => {
        gitDummyCommit('feat: first commit');
        shell.exec('git tag -a v1.0.0 -m "my awesome first release"');
        gitDummyCommit('feat: new feature!');

        releaseMe({
            silent: true
        })
            .then(() => {
                // check last commit message
                shell.exec('git log --oneline -n1').stdout.should.match(/chore\(release\): 1\.1\.0/);
                // check annotated tag message
                shell.exec('git tag -l -n1 v1.1.0').stdout.should.match(/chore\(release\): 1\.1\.0/);
                done();
            });
    });

    describe('bower.json support', () => {
        beforeEach(() => {
            writeBowerJson('1.0.0');
        });

        it('bumps verson # in bower.json', (done) => {
            gitDummyCommit('feat: first commit');
            shell.exec('git tag -a v1.0.0 -m "my awesome first release"');
            gitDummyCommit('feat: new feature!');

            releaseMe({
                silent: true
            })
                .then(() => {
                    JSON.parse(fs.readFileSync('bower.json', 'utf-8')).version.should.equal('1.1.0');
                    getPackageVersion().should.equal('1.1.0');

                    done();
                });
        });
    });
});
