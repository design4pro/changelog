#!/usr/bin/env node
import releaseMe from './index';
import cmdParser from './command';

/* istanbul ignore if */
if (process.version.match(/v(\d+)\./)[1] < 4) {
  console.error('release-me: Node v4 or greater is required. `release-me` did not run.');
} else {
  releaseMe(cmdParser.argv)
    .catch(() => {
      process.exit(1);
    });
}
