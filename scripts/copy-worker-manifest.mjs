import { awsJson } from './aws-cli.mjs';

// Docker transfers the blobs. Copy the original manifest separately because
// Docker can translate OCI/Docker manifest formats, changing the image digest.
const [repository, region, digest, tag] = process.argv.slice(2);
if (!/^[a-z0-9][a-z0-9/_.-]+$/.test(repository || '') ||
    !String(process.env.WW_CHECK_REGIONS).split(',').includes(region) ||
    !/^sha256:[a-f0-9]{64}$/.test(digest || '') || !/^regional-[a-f0-9]{64}$/.test(tag || '')) {
  throw new Error('Invalid regional image manifest copy arguments.');
}
const source = awsJson(['ecr', 'batch-get-image', '--repository-name', repository, '--image-ids', `imageDigest=${digest}`]);
const image = source.images?.[0];
if (source.failures?.length || image?.imageId?.imageDigest !== digest || !image?.imageManifest) throw new Error('Could not read the verified source manifest.');
if (!['application/vnd.docker.distribution.manifest.v2+json', 'application/vnd.oci.image.manifest.v1+json'].includes(image.imageManifestMediaType)) throw new Error('Regional copy requires a single-image manifest.');
try {
  const copied = awsJson(['ecr', 'put-image', '--repository-name', repository, '--image-tag', tag,
    '--image-digest', digest, '--image-manifest', image.imageManifest, '--image-manifest-media-type', image.imageManifestMediaType], { region });
  if (copied.image?.imageId?.imageDigest !== digest) throw new Error('Regional manifest copy did not preserve the verified source digest.');
} catch (error) {
  if (!/\((ImageAlreadyExistsException|ImageTagAlreadyExistsException)\)/.test(error.message)) throw error;
  // A retry or concurrent deployment can find the immutable tag already set.
  // Accept it only after verifying that it points to the exact source digest.
  const existing = awsJson(['ecr', 'describe-images', '--repository-name', repository, '--image-ids', `imageTag=${tag}`], { region });
  if (existing.imageDetails?.[0]?.imageDigest !== digest) throw new Error('Existing regional tag does not match the verified source digest.');
}
console.log(`Verified source manifest copied to ${region}.`);
