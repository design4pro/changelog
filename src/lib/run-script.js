import chalk from 'chalk';
import checkpoint from './checkpoint';
import figures from 'figures';
import runExec from './run-exec';

function runScript(argv, hookName, newVersion, scripts, cb) {
  if (!scripts[hookName]) return Promise.resolve();
  let command = scripts[hookName];
  if (newVersion) command += ' --new-version="' + newVersion + '"';
  checkpoint(argv, 'Running lifecycle script "%s"', [hookName]);
  checkpoint(argv, '- execute command: "%s"', [command], chalk.blue(figures.info));
  return runExec(argv, command);
}

export default runScript;
