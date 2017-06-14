# Release Me

Travis [![travis build](https://img.shields.io/travis/design4pro/release-me.svg)](https://travis-ci.org/design4pro/release-me)

CircleCi [![CircleCI](https://img.shields.io/circleci/project/github/design4pro/release-me.svg)](https://github.com/design4pro/release-me)

[![codecov coverage](https://img.shields.io/codecov/c/gh/design4pro/release-me.svg)](https://codecov.io/gh/design4pro/release-me)

[![npm](https://img.shields.io/npm/v/release-me.svg)](https://www.npmjs.com/package/release-me) [![npm](https://img.shields.io/npm/dt/release-me.svg)](https://www.npmjs.com/package/release-me)

[![Greenkeeper badge](https://badges.greenkeeper.io/design4pro/release-me.svg)](https://greenkeeper.io/)

> stop using npm version, use release-me

Automatic versioning and CHANGELOG generation.

How it works:

1. when you're ready to release to npm:
2. `git checkout master; git pull origin master`
3. `run release-me`
4. `git push --follow-tags origin master; npm publish`

`release-me` does the following:

1. bumps the version in package.json/bower.json (based on your commit history)
2. uses conventional-changelog (with [conventional-changelog-release-me](https://github.com/design4pro/conventional-changelog-release-me) preset) to update CHANGELOG.md
3. commits package.json (et al.) and CHANGELOG.md
4. tags a new release

###Installation

**As npm run script**

Install and add to devDependencies:

```bash
npm i --save-dev release-me
```

Add an npm run script to your package.json:

```json
{
  "scripts": {
    "release": "release-me"
  }
}
```

Now you can use npm run release in place of npm version.

This has the benefit of making your repo/package more portable, so that other developers can cut releases without having to globally install `release-me` their machine.

**As global bin**

Install globally (add to your PATH):

```bash
npm i -g release-me
```

Now you can use `release-me` in place of npm version.

This has the benefit of allowing you to use `release-me` on any repo/package without adding a dev dependency to each one.
