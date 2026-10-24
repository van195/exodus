import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const backendDir = fileURLToPath(new URL('../server/', import.meta.url));
const frontendDir = fileURLToPath(new URL('../exo/', import.meta.url));
const backendRequire = createRequire(new URL('../server/package.json', import.meta.url));
const frontendRequire = createRequire(new URL('../exo/package.json', import.meta.url));
const backendEnv = { ...process.env };
try {
  backendRequire('dotenv').config({ path: `${backendDir}.env`, processEnv: backendEnv, quiet: true });
} catch {
  console.error('Backend dependencies are missing. Run npm install in exodus/server.');
  process.exit(1);
}
const port = Number(backendEnv.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Backend PORT must be a number between 1 and 65535.');
  process.exit(1);
}
const backendUrl = `http://127.0.0.1:${port}`;
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
function launch(args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit' });
  children.add(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { children.delete(child); if (!stopping) stop(code || 1); });
  return child;
}
async function healthy() {
  try {
    const response = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(1000) });
    return response.ok && (await response.json()).status === 'ok';
  } catch { return false; }
}

try {
  const vitePackagePath = frontendRequire.resolve('vite/package.json');
  const vitePackage = frontendRequire(vitePackagePath);
  const vite = resolve(dirname(vitePackagePath), vitePackage.bin.vite);
  if (!(await healthy())) {
    console.log(`Starting Exodus backend at ${backendUrl}`);
    launch(['src/server.js'], backendDir, backendEnv);
    let ready = false;
    for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
      if (await healthy()) { ready = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error(`Backend did not become ready at ${backendUrl}. Check the backend error above.`);
  } else console.log(`Using running backend at ${backendUrl}`);
  if (!stopping) launch([vite, ...process.argv.slice(2)], frontendDir, { ...process.env, EXODUS_API_TARGET: backendUrl });
} catch (error) {
  console.error(error.code === 'MODULE_NOT_FOUND'
    ? 'Frontend dependencies are missing. Run npm install in exodus/exo.' : error.message);
  stop(1);
}
