import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('worker build exports a Lambda-compatible single-image manifest', async () => {
  const source = await fs.readFile('infra/scripts/build-worker-image.sh', 'utf8');
  const buildLine = source.split(/\r?\n/).find((line) => line.startsWith('docker buildx build ') && line.includes('browser-worker/Dockerfile')) ?? '';
  assert.ok(buildLine, 'missing browser-worker buildx command');
  assert.match(buildLine, /--platform linux\/amd64(?:\s|$)/);
  assert.match(buildLine, /--provenance=false(?:\s|$)/);
  assert.match(buildLine, /--sbom=false(?:\s|$)/);
  assert.match(buildLine, /--load(?:\s|$)/);
  assert.match(source, /imageManifestMediaType/);
  assert.match(source, /application\/vnd\.docker\.distribution\.manifest\.v2\+json/);
  assert.match(source, /application\/vnd\.oci\.image\.manifest\.v1\+json/);
  assert.doesNotMatch(source, /application\/vnd\.oci\.image\.index\.v1\+json[^\n]*\)\s*;;/);
});

test('worker build generates a unique immutable ECR transport tag', async () => {
  const source = await fs.readFile('infra/scripts/build-worker-image.sh', 'utf8');
  assert.match(source, /DEFAULT_WORKER_IMAGE_TAG=/);
  assert.match(source, /WORKER_IMAGE_TAG="\$\{DEFAULT_WORKER_IMAGE_TAG\}-\$\(date -u \+%Y%m%dT%H%M%SZ\)-\$\$"/);
  assert.match(source, /ImageNotFoundException/);
  assert.match(source, /already exists in the immutable repository/);
  assert.match(source, /WORKER_IMAGE_TAG=\$\{WORKER_IMAGE_TAG\}/);
  assert.doesNotMatch(source, /^: "\$\{WORKER_IMAGE_TAG:=[^}]+\}"$/m);
});

