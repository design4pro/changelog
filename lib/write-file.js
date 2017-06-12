'use strict';

const fs = require('fs');

module.exports = function (args, filePath, content) {
  /* istanbul ignore if */
  if (args.dryRun) {
    return;
  }

  fs.writeFileSync(filePath, content, 'utf8');
};
