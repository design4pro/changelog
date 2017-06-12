'use strict';

const chalk = require('chalk');
const checkpoint = require('./checkpoint');
const figures = require('figures');
const runExec = require('./run-exec');

module.exports = (args, hookName) => {
  const scripts = args.scripts;
  /* istanbul ignore if */
  if (!scripts || !scripts[hookName]) {
    return Promise.resolve();
  }

  /* istanbul ignore next */
  let command = scripts[hookName];

  /* istanbul ignore next */
  checkpoint(args, 'Running lifecycle script "%s"', [hookName]);
  /* istanbul ignore next */
  checkpoint(args, '- execute command: "%s"', [command], chalk.blue(figures.info));

  /* istanbul ignore next */
  return runExec(args, command);
};
