/**
 * S3-backed binary asset adapter used by the AWS runtime.
 *
 * The bucket policy and encryption settings are owned by CloudFormation. This
 * adapter never makes objects public and never accepts an arbitrary bucket.
 */
export class S3Assets {
  constructor({
    bucketName,
    region = process.env.AWS_REGION ?? 'us-east-1',
    client = null,
    accountId = null,
    stage = null,
    availableRegions = [],
  }) {
    if (!bucketName) throw new Error('SNAPSHOT_BUCKET_NAME is required.');
    this.bucketName = bucketName;
    this.region = region;
    this.client = client;
    this.clients = new Map(client ? [[region, client]] : []);
    this.regionalLocations = accountId && stage
      ? [...new Set(availableRegions.map(String))]
        .filter((candidate) => candidate && candidate !== region)
        .map((candidate) => ({ region: candidate, bucketName: `webwatch-${stage}-${accountId}-${candidate}-captures` }))
      : [];
  }

  async initialize() {}

  async #sdk(region = this.region) {
    if (this.clients.has(region)) return this.clients.get(region);
    const { S3Client } = await import('@aws-sdk/client-s3');
    const client = new S3Client({ region });
    this.clients.set(region, client);
    if (region === this.region) this.client = client;
    return client;
  }

  async put(key, data, options = {}) {
    const safeKey = assertKey(key);
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await (await this.#sdk()).send(new PutObjectCommand({
      Bucket: this.bucketName,
      Key: safeKey,
      Body: data,
      ContentType: options.contentType ?? contentType(safeKey),
      CacheControl: options.cacheControl ?? 'private, max-age=300',
      Metadata: options.metadata,
    }));
    return safeKey;
  }

  async copy(sourceKey, targetKey) {
    const source = assertKey(sourceKey);
    const target = assertKey(targetKey);
    const { CopyObjectCommand } = await import('@aws-sdk/client-s3');
    await (await this.#sdk()).send(new CopyObjectCommand({
      Bucket: this.bucketName,
      CopySource: `${this.bucketName}/${encodeCopySource(source)}`,
      Key: target,
      MetadataDirective: 'COPY',
    }));
    return target;
  }

  async copyReference(reference, targetKey) {
    const { key: source, bucketName, region } = this.#reference(reference);
    const target = assertKey(targetKey);
    const { CopyObjectCommand } = await import('@aws-sdk/client-s3');
    await (await this.#sdk(region)).send(new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${encodeCopySource(source)}`,
      Key: target,
      MetadataDirective: 'COPY',
    }));
    return { key: target, bucketName, region };
  }

  async read(key) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const result = await (await this.#sdk()).send(new GetObjectCommand({ Bucket: this.bucketName, Key: assertKey(key) }));
    if (typeof result.Body?.transformToByteArray === 'function') return Buffer.from(await result.Body.transformToByteArray());
    const chunks = [];
    for await (const chunk of result.Body ?? []) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  async readReference(reference) {
    const { key, bucketName, region } = this.#reference(reference);
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const result = await (await this.#sdk(region)).send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
    if (typeof result.Body?.transformToByteArray === 'function') return Buffer.from(await result.Body.transformToByteArray());
    const chunks = [];
    for await (const chunk of result.Body ?? []) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  async signedReadUrl(reference, expiresIn = 900) {
    const { key, bucketName, region } = this.#reference(reference);
    const [{ GetObjectCommand }, { getSignedUrl }] = await Promise.all([
      import('@aws-sdk/client-s3'),
      import('@aws-sdk/s3-request-presigner'),
    ]);
    return getSignedUrl(await this.#sdk(region), new GetObjectCommand({ Bucket: bucketName, Key: key }), { expiresIn: Math.max(1, Math.min(3600, Math.floor(Number(expiresIn) || 900))) });
  }

  async remove(key) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await (await this.#sdk()).send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: assertKey(key) }));
  }

  async removeReference(reference) {
    const { key, bucketName, region } = this.#reference(reference);
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await (await this.#sdk(region)).send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
  }

  async exists(key) {
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
    try {
      await (await this.#sdk()).send(new HeadObjectCommand({ Bucket: this.bucketName, Key: assertKey(key) }));
      return true;
    } catch (error) {
      if (['NotFound', 'NoSuchKey'].includes(error?.name) || error?.$metadata?.httpStatusCode === 404) return false;
      throw error;
    }
  }

  async removeWatcher(accountId, watcherId) {
    assertIdentifier(accountId, 'account');
    assertIdentifier(watcherId, 'watcher');
    await Promise.all(this.#locations().flatMap((location) => [
      this.#removePrefix(`history/${accountId}/${watcherId}/`, location),
      ...['7', '30', '90', '180', '365', 'indefinite'].map((retention) => this.#removePrefix(`capture-history/${retention}/${accountId}/${watcherId}/`, location)),
      this.#removePrefix(`baselines/${accountId}/${watcherId}/`, location),
    ]));
  }

  async removeAccount(accountId) {
    assertIdentifier(accountId, 'account');
    await Promise.all(this.#locations().flatMap((location) => [
      this.#removePrefix(`history/${accountId}/`, location),
      this.#removePrefix(`capture-history/7/${accountId}/`, location),
      this.#removePrefix(`capture-history/30/${accountId}/`, location),
      this.#removePrefix(`capture-history/90/${accountId}/`, location),
      this.#removePrefix(`capture-history/180/${accountId}/`, location),
      this.#removePrefix(`capture-history/365/${accountId}/`, location),
      this.#removePrefix(`capture-history/indefinite/${accountId}/`, location),
      this.#removePrefix(`baselines/${accountId}/`, location),
      this.#removePrefix(`reports/${accountId}/`, location),
      this.#removePrefix(`run-results/${accountId}/`, location),
    ]));
  }

  // S3 lifecycle owns production historical retention. This method exists so the
  // maintenance service can use the same interface as LocalAssets.
  async cleanupHistory() { return 0; }

  #reference(reference) {
    const value = typeof reference === 'string' ? { key: reference } : reference;
    const key = assertKey(value?.key);
    const bucketName = String(value?.bucketName || this.bucketName);
    const region = String(value?.region || this.region);
    if (!this.#locations().some((location) => location.bucketName === bucketName && location.region === region)) {
      throw Object.assign(new Error('Evidence location is outside the configured deployment.'), { code: 'CAPTURE_ISOLATION_FAILED' });
    }
    return { key, bucketName, region };
  }

  #locations() {
    return [{ region: this.region, bucketName: this.bucketName }, ...this.regionalLocations];
  }

  async #removePrefix(prefix, { bucketName = this.bucketName, region = this.region } = {}) {
    const { ListObjectVersionsCommand, ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
    for (;;) {
      const client = await this.#sdk(region);
      const result = await client.send(new ListObjectVersionsCommand({ Bucket: bucketName, Prefix: prefix, MaxKeys: 1000 }));
      let objects = [...(result.Versions ?? []), ...(result.DeleteMarkers ?? [])]
        .map((entry) => ({ Key: entry.Key, VersionId: entry.VersionId }))
        .filter((entry) => entry.Key && entry.VersionId);
      if (!objects.length) {
        const current = await client.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix, MaxKeys: 1000 }));
        objects = (current.Contents ?? []).map((entry) => ({ Key: entry.Key })).filter((entry) => entry.Key);
      }
      if (!objects.length) break;
      const deleted = await client.send(new DeleteObjectsCommand({ Bucket: bucketName, Delete: { Objects: objects, Quiet: true } }));
      if (deleted.Errors?.length) throw new Error(`S3 permanently failed to delete ${deleted.Errors.length} object version(s) for prefix ${prefix}.`);
    }
  }
}

function assertKey(value) {
  const key = String(value ?? '');
  if (!key || key.startsWith('/') || key.includes('..') || /[\u0000-\u001f]/.test(key) || key.length > 1024) throw new Error('Unsafe S3 asset key.');
  return key;
}
function assertIdentifier(value, label) {
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(String(value))) throw new Error(`Unsafe ${label} asset identifier.`);
}
function encodeCopySource(key) { return key.split('/').map(encodeURIComponent).join('/'); }
function contentType(key) {
  if (key.endsWith('.png')) return 'image/png';
  if (/\.jpe?g$/i.test(key)) return 'image/jpeg';
  if (key.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (key.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}
