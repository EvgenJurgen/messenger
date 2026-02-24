/**
 * Runs npm run dev with NODE_OPTIONS cleared so the Vite process
 * is not attached by the debugger when launched from VS Code/Cursor Run.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = { ...process.env, NODE_OPTIONS: '' };
const child = spawn('npm', ['run', 'dev'], {
  cwd: path.resolve(__dirname),
  env,
  stdio: 'inherit',
  shell: true,
});
child.on('exit', (code) => process.exit(code ?? 0));
