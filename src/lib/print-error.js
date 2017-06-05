import chalk from 'chalk';

function printError(argv, msg, opts) {
  if (!argv.silent) {
    opts = Object.assign({
      level: 'error',
      color: 'red'
    }, opts);

    console[opts.level](chalk[opts.color](msg));
  }
}

export default printError;
