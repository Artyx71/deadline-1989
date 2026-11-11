import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Invoke tool entry points directly: this checkout's ':' cannot be a PATH entry.
const root = fileURLToPath(new URL('../', import.meta.url));
const bins = {
  tsc: 'node_modules/typescript/bin/tsc',
  eslint: 'node_modules/eslint/bin/eslint.js',
  vitest: 'node_modules/vitest/vitest.mjs',
  playwright: 'node_modules/@playwright/test/cli.js',
  vite: 'apps/web/node_modules/vite/bin/vite.js',
  tsx: 'apps/server/node_modules/tsx/dist/cli.mjs',
  prettier: 'node_modules/prettier/bin/prettier.cjs',
};
function launch(tool, args = [], cwd = root, env = {}) {
  const executable = bins[tool] ? resolve(root, bins[tool]) : resolve(root, tool);
  return spawn(process.execPath, [executable, ...args], { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
}
async function run(tool, args = [], cwd = root, env = {}) {
  const child = launch(tool, args, cwd, env);
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 1)); });
  if (code !== 0) process.exit(Number(code));
}
const mode = process.argv[2];
const extra = process.argv.slice(3);
const shared = async () => {
  await run('tsc', ['-p', 'packages/shared/tsconfig.json']);
  await run('tsc', ['-p', 'packages/domain/tsconfig.json']);
};
switch (mode) {
  case 'shared': await shared(); break;
  case 'typecheck':
    await shared();
    for (const dir of ['apps/server', 'apps/web']) await run('tsc', ['--noEmit', '-p', `${dir}/tsconfig.json`]);
    break;
  case 'lint': await run('eslint', ['apps', 'packages', 'tests', 'e2e', '--no-error-on-unmatched-pattern', ...extra]); break;
  case 'test': await shared(); await run('vitest', ['run', ...extra]); break;
  case 'e2e': await run('playwright', ['test', ...extra]); break;
  case 'pages:e2e': await run('playwright', ['test', '--config', 'playwright.pages.config.ts', ...extra]); break;
  case 'build:pages':
    await shared();
    await run('tsc', ['--noEmit', '-p', 'apps/web/tsconfig.json']);
    await run('vite', ['build'], resolve(root, 'apps/web'), { VITE_BASE_PATH: '/deadline-1989/', VITE_STATIC_PROFILE: '1', VITE_OUT_DIR: 'dist-pages' });
    break;
  case 'preview:pages':
    await run('vite', ['preview', '--host', '127.0.0.1', '--port', '5176', '--strictPort'], resolve(root, 'apps/web'), { VITE_BASE_PATH: '/deadline-1989/', VITE_STATIC_PROFILE: '1', VITE_OUT_DIR: 'dist-pages' });
    break;
  case 'build':
    await shared();
    await run('tsc', ['-p', 'apps/server/tsconfig.build.json']);
    await run('tsc', ['--noEmit', '-p', 'apps/web/tsconfig.json']);
    await run('vite', ['build'], resolve(root, 'apps/web'));
    break;
  case 'dev': {
    await shared();
    const children = [launch('tsx', [...(process.env.DEADLINE_NO_WATCH === '1' ? [] : ['watch']), 'src/index.ts'], resolve(root, 'apps/server')), launch('vite', ['--host', '127.0.0.1'], resolve(root, 'apps/web'))];
    const stop = () => children.forEach(child => child.kill('SIGTERM'));
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    for (const child of children) child.once('exit', code => { stop(); process.exit(code ?? 0); });
    break;
  }
  case 'start': await run('apps/server/dist/index.js'); break;
  case 'format':
  case 'format:check':
    await run('prettier', [mode === 'format' ? '--write' : '--check', ...(extra.length ? extra : ['**/*.{ts,tsx,js,mjs,cjs,json,css,md,yaml,yml}'])]);
    break;
  default: throw new Error(`Unknown workspace command: ${mode}`);
}
