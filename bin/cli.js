#!/usr/bin/env node

var releaseMe = require('../index');
var cmdParser = require('../command');

if (process.version.match(/v(\d+)\./)[1] < 4) {
  console.error('release-me: Node v4 or greater is required. `release-me` did not run.');
} else {
  releaseMe(cmdParser.argv)
    .catch(function () {
      process.exit(1);
    });
}
