/**
 * Runs npm run start:dev with NODE_OPTIONS cleared so the Nest process
 * is not attached by the debugger when launched from VS Code/Cursor Run.
 */
const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env, NODE_OPTIONS: '' };
const child = spawn('npm', ['run', 'start:dev'], {
  cwd: path.resolve(__dirname),
  env,
  stdio: 'inherit',
  shell: true,
});
child.on('exit', (code) => process.exit(code ?? 0));
