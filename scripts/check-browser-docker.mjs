import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const help = 'Install and start Docker yourself, then ensure this user can access the Docker daemon. See https://en.opensuse.org/Docker for openSUSE guidance.';

export function ensureBrowserDockerReady() {
  const cli = spawnSync('docker', ['--version'], { encoding: 'utf8', timeout: 10_000 });
  if (cli.error?.code === 'ENOENT') throw new Error(`Docker CLI was not found. ${help}`);
  if (cli.error || cli.status !== 0) throw new Error(`Docker CLI could not run. ${help}`);

  const server = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8', timeout: 15_000 });
  if (server.error || server.status !== 0 || !server.stdout.trim()) {
    throw new Error(`Docker is installed but its daemon is unreachable or this user lacks access. ${help}`);
  }
  return { client: cli.stdout.trim(), server: server.stdout.trim() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { client, server } = ensureBrowserDockerReady();
    console.log(`Docker is ready: ${client}; daemon ${server}. Run npm run test:browser:docker.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
