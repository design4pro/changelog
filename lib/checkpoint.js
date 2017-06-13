'use strict';

var chalk = require('chalk');
var figures = require('figures');
var util = require('util');

module.exports = function (argv, msg, args, figure) {
  var defaultFigure = args.dryRun ? chalk.yellow(figures.tick) : chalk.green(figures.tick);

  if (!argv.silent) {
    console.info((figure || defaultFigure) + ' ' + util.format.apply(util, [msg].concat(args.map(function (arg) {
      return chalk.bold(arg);
    }))));
  }
};
