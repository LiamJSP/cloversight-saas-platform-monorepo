import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertWorkstationNode } from './workstation-runtime.mjs';
import { assertDependencyLock } from './dependency-locks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assertWorkstationNode();
assertDependencyLock(root);
const browsersDir = path.join(root, '.local-browsers');
fs.mkdirSync(browsersDir, { recursive: true });
const env = { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersDir };
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/playwright/cli.js'), 'install', 'chromium'], { cwd: root, env, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

process.env.PLAYWRIGHT_BROWSERS_PATH = browsersDir;
const { chromium } = await import('playwright');
const preferred = chromium.executablePath();
fs.accessSync(preferred, fs.constants.X_OK);

const envPath=path.join(root,'.env');
let raw='';try{raw=fs.readFileSync(envPath,'utf8')}catch{}
const line=`CHROME_EXECUTABLE_PATH=${preferred}`;
if (/^CHROME_EXECUTABLE_PATH=.*$/m.test(raw)) raw=raw.replace(/^CHROME_EXECUTABLE_PATH=.*$/m,line); else raw += `${raw && !raw.endsWith('\n')?'\n':''}${line}\n`;
fs.writeFileSync(envPath,raw,{mode:0o600});
fs.chmodSync(envPath,0o600);
console.log(`Project-local Chromium installed: ${preferred}`);
console.log(`Updated ${envPath} with CHROME_EXECUTABLE_PATH.`);
