import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Included in a source ZIP so the same checkout can be repackaged without Git.
export const archiveInventory = '.release-files.json';
const privateDirectory = new Set(['.git', '.aws', '.ssh', '.gnupg', '.local', '.local-browsers', '.astro', 'node_modules', 'coverage', '.aws-sam', 'cdk.out', '__pycache__']);
const privateName = /^(?:\.env(?:$|[._-])|\.envrc$|\.npmrc$|\.netrc$|\.pypirc$|credentials(?:\.(?:csv|json|ini))?$|\.DS_Store$|id_(?:rsa|ed25519|ecdsa)(?:\.|$))|(?:\.(?:pem|key|ppk|pfx|p12|jks|tfstate(?:\..+)?|tfvars(?:\.json)?|log|swp|bak|backup|orig|pyc)|~)$/i;

// Block recognizable credential formats even if the file was deliberately staged.
const credential = /-----BEGIN (?:RSA |OPENSSH |EC |DSA |ENCRYPTED )?PRIVATE KEY-----|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}|\bwhsec_[A-Za-z0-9]{24,}|\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,})/;

function checkName(name) {
  const parts = typeof name === 'string' ? name.split('/') : [];
  if (!parts.length || parts.some(part => !part || part === '.' || part === '..' || part.startsWith('-')) ||
      /[\x00-\x1f\x7f\\:*?\[\]]/.test(name)) throw new Error('Unsafe filename in the release inventory.');
  if (name !== '.env.example' && parts.some(part => privateDirectory.has(part) || privateName.test(part))) {
    throw new Error('Private or temporary file in the release inventory: ' + name);
  }
}

export function checkedFiles(root, files) {
  const absoluteRoot = fs.realpathSync(root);
  if (!Array.isArray(files) || !files.length || new Set(files).size !== files.length) throw new Error('Invalid release inventory.');
  for (const file of files) {
    checkName(file);
    const source = path.join(absoluteRoot, file);
    if (!fs.lstatSync(source).isFile() || fs.realpathSync(source) !== source) throw new Error('Release files must be regular files: ' + file);
    const data = fs.readFileSync(source);
    if (!data.includes(0) && credential.test(data.toString('utf8'))) throw new Error('Possible credential in release file: ' + file);
  }
  return [...files].sort();
}

export function releaseSources(root) {
  const tracked = fs.existsSync(path.join(root, '.git'));
  const names = tracked
    ? execFileSync('git', ['ls-files', '--cached', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
    : JSON.parse(fs.readFileSync(path.join(root, archiveInventory), 'utf8'));
  const files = checkedFiles(root, names);
  for (const file of files) {
    if (file === archiveInventory || file.startsWith('dist/') || file.startsWith('docs/reference/jsdoc/') || /\.zip$/i.test(file)) {
      throw new Error('Remove generated artifacts from the source inventory: ' + file);
    }
  }
  return files;
}

export function addToZip(archive, root, names) {
  const files = checkedFiles(root, names);
  execFileSync('zip', ['-q', '-X', '-MM', path.resolve(archive), '-@'], {
    cwd: root, input: files.join('\n') + '\n', stdio: ['pipe', 'inherit', 'inherit'],
  });
}
