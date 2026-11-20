import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const digest = `sha256:${'a'.repeat(64)}`;
function run({ error, existingDigest = digest, mediaType = 'application/vnd.oci.image.manifest.v1+json', sourceDigest = digest } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloversight-image-'));
  try {
    fs.writeFileSync(path.join(root, 'aws'), `#!/usr/bin/env node
import assert from 'node:assert/strict';
const a = process.argv.slice(2), op = a[a.indexOf('ecr')+1];
const get = name => a[a.indexOf(name)+1];
if(op==='batch-get-image'){
  assert.equal(get('--region'),'us-east-1');
  console.log(JSON.stringify({images:[{imageId:{imageDigest:process.env.SOURCE_DIGEST},imageManifest:'{ "schemaVersion": 2 }',imageManifestMediaType:process.env.MEDIA_TYPE}]}));
} else if(op==='put-image'){
  assert.equal(get('--region'),'us-west-2');
  assert.equal(get('--image-manifest'),'{ "schemaVersion": 2 }');
  assert.equal(get('--image-digest'),process.env.EXPECTED_DIGEST);
  assert.equal(get('--image-manifest-media-type'),process.env.MEDIA_TYPE);
  if(process.env.PUT_ERROR){ console.error(process.env.PUT_ERROR);process.exit(1); }
  console.log(JSON.stringify({image:{imageId:{imageDigest:process.env.EXPECTED_DIGEST}}}));
} else if(op==='describe-images'){
  assert.equal(get('--region'),'us-west-2');
  console.log(JSON.stringify({imageDetails:[{imageDigest:process.env.EXISTING_DIGEST}]}));
} else throw new Error('Unexpected call '+op);
`, { mode: 0o755 });
    return spawnSync(process.execPath, ['scripts/copy-worker-manifest.mjs', 'webwatch-browser-worker', 'us-west-2', digest, `regional-${'a'.repeat(64)}`], {
      encoding: 'utf8', env: { ...process.env, PATH: `${root}:${process.env.PATH}`, AWS_REGION: 'us-east-1', WW_CHECK_REGIONS: 'us-east-1,us-west-2', EXPECTED_DIGEST: digest, SOURCE_DIGEST: sourceDigest, MEDIA_TYPE: mediaType, PUT_ERROR: error || '', EXISTING_DIGEST: existingDigest },
    });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('regional copy passes the original manifest, media type and digest without conversion', () => {
  for (const mediaType of ['application/vnd.oci.image.manifest.v1+json', 'application/vnd.docker.distribution.manifest.v2+json']) {
    const result = run({ mediaType }); assert.equal(result.status, 0, result.stderr);
  }
});
test('already-present immutable regional tags require an exact digest readback', () => {
  for (const name of ['ImageAlreadyExistsException', 'ImageTagAlreadyExistsException']) {
    const result = run({ error: `An error occurred (${name})` }); assert.equal(result.status, 0, result.stderr);
  }
  const wrong = run({ error: 'An error occurred (ImageTagAlreadyExistsException)', existingDigest: `sha256:${'b'.repeat(64)}` });
  assert.notEqual(wrong.status, 0); assert.match(wrong.stderr, /does not match/);
});
test('regional copy rejects unexpected source digests, image indexes and permission failures', () => {
  for (const options of [{ sourceDigest: `sha256:${'b'.repeat(64)}` }, { mediaType: 'application/vnd.oci.image.index.v1+json' }, { error: 'An error occurred (AccessDeniedException)' }]) {
    const result = run(options); assert.notEqual(result.status, 0);
  }
});
