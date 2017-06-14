'use strict';

var chalk = require('chalk');
var checkpoint = require('./checkpoint');
var figures = require('figures');
var runExec = require('./run-exec');

module.exports = function (args, hookName) {
  var scripts = args.scripts;

  if (!scripts || !scripts[hookName]) {
    return Promise.resolve();
  }

  var command = scripts[hookName];

  checkpoint(args, 'Running lifecycle script "%s"', [hookName]);
  checkpoint(args, '- execute command: "%s"', [command], chalk.blue(figures.info));

  return runExec(args, command);
};
