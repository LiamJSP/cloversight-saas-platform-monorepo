// A conditional S3 lease suppresses concurrent duplicate browser launches.
// The 210s lease exceeds the configured 180s Lambda hard timeout. Cached
// results remain immutable and must be checked before and after acquisition.
export async function acquireCaptureLease({ client, bucket, key, fingerprint, owner, now = Date.now() }) {
  const { GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');
  let previous;
  let etag;
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    previous = JSON.parse(await response.Body.transformToString());
    etag = response.ETag;
  } catch (error) {
    if (error.name !== 'NoSuchKey' && error.name !== 'NotFound' && error.$metadata?.httpStatusCode !== 404) throw error;
  }
  if (previous) {
    if (previous.fingerprint !== fingerprint || !Number.isFinite(previous.expiresAt) || !etag) {
      throw Object.assign(new Error('Capture lease does not match the immutable job.'), { code: 'CAPTURE_JOB_BINDING_MISMATCH' });
    }
    if (previous.expiresAt > now) throw busy(Math.ceil((previous.expiresAt - now) / 1000) + 1);
    if (Number(previous.attempts ?? 0) >= 3) throw Object.assign(new Error('Regional capture recovery attempts exhausted.'), { code: 'CAPTURE_ATTEMPT_LIMIT' });
  }
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket, Key: key, ContentType: 'application/json', CacheControl: 'no-store',
      Body: JSON.stringify({ fingerprint, owner, attempts: Number(previous?.attempts ?? 0) + 1, expiresAt: now + 210_000 }),
      ...(previous ? { IfMatch: etag } : { IfNoneMatch: '*' }),
    }));
  } catch (error) {
    if ([409, 412].includes(error.$metadata?.httpStatusCode) || error.name === 'PreconditionFailed') throw busy(211);
    throw error;
  }
}

function busy(retryAfterSeconds) {
  return Object.assign(new Error('This regional capture is already running.'), { code: 'CAPTURE_ALREADY_RUNNING', retryAfterSeconds });
}
