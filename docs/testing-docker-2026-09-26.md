# Portable Chromium browser tests — 2026-09-26

Playwright's native browser installer may display an unsupported-OS warning on openSUSE Tumbleweed and fetch a fallback Ubuntu browser. The official [Playwright Docker guidance](https://playwright.dev/docs/docker) provides a Linux image with browsers and their system libraries; it says to match the image and package versions. This project pins both to `1.61.0`. The existing AWS Lambda worker image is separate and unchanged.

## Local browser suite

From the extracted project root, with Docker, Node and npm available on the host:

```bash
npm run browser:docker:check
npm run test:browser:docker
```

The readiness check looks for the Docker CLI and a reachable daemon. It does not install Docker, start its service, or change permissions. If it fails on openSUSE Tumbleweed, follow [openSUSE's Docker setup guide](https://en.opensuse.org/Docker) yourself, then rerun the check. The test command repeats the check, so running it directly also fails with actionable setup instructions.

Or use Docker directly, with no host Node/npm or Chromium needed:

```bash
docker build -f tests/docker/Dockerfile.browser -t cloversight-browser-tests:v1.61.0 .
docker run --rm --init --network none --shm-size=1g cloversight-browser-tests:v1.61.0
```

The image installs npm dependencies using the lockfile and uses the version-matched browser already in the official image. A `.dockerignore` keeps `.env`, `node_modules`, local state and build artifacts out of the Docker build context. The local test container has no external network access; its disposable HTTP server and Chromium communicate over container loopback. No mount or host port is needed. Browser images are substantially larger than the source archive and must be downloaded or cached on each Docker host.

`npm run verify` still runs locally without a browser and does not need Docker. The native `npm run browser:install` and `npm run test:browser` remain available for developer workstations with compatible Chromium installations. The npm command additions change `package.json`, which participates in the production worker source fingerprint. Running these tests requires no AWS deployment; if you later deploy the full application from this ZIP, rebuild and deploy the worker image through [the deployment guide](deployment.md) so the source fingerprint matches.

## Staging browser suite

After exporting the staging variables in [the staging test guide](testing-additions-2026-09-26.md), run:

```bash
npm run test:staging:browser:docker
```

The staging test container receives only the exact hostname, base URL, first account ID, and short-lived access token. It does not mount `.env` or your AWS credentials. Network access is enabled because the browser must reach the trusted staging site. Docker administrators can inspect live container environment values. This run remains opt-in and uses the existing GET-only browser API guard; it is not part of `verify` or the offline local browser suite.

No containers, tests, builds or deployments were run while authoring this integration.
