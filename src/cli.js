#!/usr/bin/env node
import changelog from './index';
import cmdParser from './command';

/* istanbul ignore if */
if (process.version.match(/v(\d+)\./)[1] < 4) {
  console.error('standard-version: Node v4 or greater is required. `standard-version` did not run.');
} else {
  changelog(cmdParser.argv, function (err) {
    if (err) {
      process.exit(1);
    }
  });
}
