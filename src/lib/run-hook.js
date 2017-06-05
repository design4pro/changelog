import chalk from 'chalk';
import checkpoint from './checkpoint';
import figures from 'figures';
import runExec from './run-exec';

function runHook(argv, hookName, newVersion, hooks, cb) {
  if (!hooks[hookName]) return Promise.resolve();
  let command = hooks[hookName] + ' --new-version="' + newVersion + '"';
  checkpoint(argv, 'Running lifecycle hook "%s"', [hookName]);
  checkpoint(argv, '- hook command: "%s"', [command], chalk.blue(figures.info));
  return runExec(argv, command);
}

export default runHook;
