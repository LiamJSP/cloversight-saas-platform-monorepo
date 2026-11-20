import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export function workerBase(source = fs.readFileSync(new URL('../infra/docker/browser-worker/Dockerfile', import.meta.url), 'utf8')) {
  const from = source.split(/\r?\n/).filter(line => /^\s*FROM\s/i.test(line));
  if (from.length !== 1 || !/^FROM public\.ecr\.aws\/lambda\/nodejs:22@sha256:[a-f0-9]{64}$/.test(from[0])) {
    throw new Error('Pin the Lambda Node 22 FROM image by SHA-256 in the worker Dockerfile.');
  }
  return from[0].slice(5);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(workerBase());
