import chalk from 'chalk';
import figures from 'figures';
import util from 'util';

function checkpoint(argv, msg, args, figure) {
  if (!argv.silent) {
    console.info((figure || chalk.green(figures.tick)) + ' ' + util.format.apply(util, [msg].concat(args.map((arg) => {
      return chalk.bold(arg);
    }))));
  }
}

export default checkpoint;
