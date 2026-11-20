/** @module aws/regional-capture-worker
 * @description Same-region browser capture, comparison and evidence persistence.
 */
import { capturePage } from '../monitoring/capture.mjs';
import { findBannedPhrases, looksLikeErrorPage, summarizeTextChanges, textChangePercent } from '../monitoring/text.mjs';
import { imageDimensions, makeReviewPreview, visualDiff } from '../monitoring/pixel.mjs';
import { isOperationalCaptureError } from '../monitoring/engine.mjs';
import { canonicalJson, fairQueueGroupId, sha256 } from '../lib.mjs';
import { createLogger } from '../logger.mjs';
import { acquireCaptureLease } from './capture-lease.mjs';
import { changeRecordVisibility, retryRecordSoon } from './sqs-retry.mjs';

const logger = createLogger(process.env.LOG_LEVEL ?? 'info');

const bucketName = process.env.CAPTURE_BUCKET_NAME ?? process.env.SNAPSHOT_BUCKET_NAME;
const region = process.env.AWS_REGION ?? 'us-east-1';
const resultQueueUrl = process.env.CAPTURE_RESULT_QUEUE_URL;
const resultQueueRegion = process.env.CAPTURE_RESULT_QUEUE_REGION;
const legacyBucketName = process.env.LEGACY_SNAPSHOT_BUCKET_NAME ?? bucketName;
const legacyBucketRegion = process.env.LEGACY_SNAPSHOT_BUCKET_REGION ?? region;
const runtime = Object.freeze({
  awsRegion: region,
  captureWidth: integerEnvironment('CAPTURE_WIDTH', 1440),
  captureHeight: integerEnvironment('CAPTURE_HEIGHT', 900),
  captureTimeoutMs: integerEnvironment('CAPTURE_TIMEOUT_MS', 150000),
  maxPageBytes: integerEnvironment('MAX_PAGE_BYTES', 10000000),
  allowPrivateTargets: String(process.env.ALLOWED_PRIVATE_TARGETS ?? 'false').toLowerCase() === 'true',
  chromePath: process.env.CHROME_EXECUTABLE_PATH ?? '/usr/bin/chromium',
});

let localS3;
const regionalS3 = new Map();
let resultSqs;

export async function handler(event, context) {
  if (!bucketName) throw new Error('CAPTURE_BUCKET_NAME is required.');
  if (!resultQueueUrl || !resultQueueRegion) throw new Error('CAPTURE_RESULT_QUEUE_URL and CAPTURE_RESULT_QUEUE_REGION are required.');
  if (runtime.allowPrivateTargets) throw new Error('Private targets are forbidden in the AWS capture worker.');
  const failures = [];
  for (const record of event?.Records ?? []) {
    try {
      const job = validateJob(JSON.parse(record.body ?? '{}'));
      let cached = await readCachedResult(job);
      if (!cached) {
        // Initial queue visibility still follows AWS's 6x timeout guidance.
        // Once executing, 240s exceeds this Lambda's hard timeout and lets a
        // killed invocation recover before the 900s durable-run deadline.
        await changeRecordVisibility(record, [process.env.CAPTURE_QUEUE_URL], 240);
        await acquireCaptureLease({ client: await s3For(region), bucket: bucketName,
          key: `${resultKey(job)}.lease`, fingerprint: jobFingerprint(job), owner: context?.awsRequestId ?? record.messageId });
        cached = await readCachedResult(job);
      }
      let result = cached ?? boundedTransportResult({ ...(await execute(job, context)), jobFingerprint: jobFingerprint(job), watcherConfigHash: job.watcherConfigHash ?? null });
      if (!cached) result = await writeResult(job, result);
      await sendResult(job, result);
      logger.info(cached ? 'capture.result.resent' : 'capture.result.sent', { messageId: record.messageId, jobId: job.jobId, runId: job.runId, region });
    } catch (error) {
      await retryRecordSoon(record, [process.env.CAPTURE_QUEUE_URL], error, logger);
      logger.error('capture.record.failed', { messageId: record.messageId, code: error?.code ?? null, message: String(error?.message ?? error) });
      failures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: failures };
}

async function execute(job, context) {
  const runRemainingMs = job.deadlineAt ? new Date(job.deadlineAt).getTime() - Date.now() : runtime.captureTimeoutMs + 20_000;
  const invocationRemainingMs = typeof context?.getRemainingTimeInMillis === 'function'
    ? context.getRemainingTimeInMillis()
    : Number.POSITIVE_INFINITY;
  const captureBudgetMs = Math.min(runtime.captureTimeoutMs, runRemainingMs - 20_000, invocationRemainingMs - 25_000);
  if (captureBudgetMs < 3_000) {
    return internalErrorResult(job, Object.assign(new Error('Regional capture job has insufficient durable-run or Lambda invocation time for a new browser and evidence persistence.'), { code: 'CAPTURE_JOB_EXPIRED' }));
  }
  let capture;
  try {
    capture = await capturePage(job.watcherConfig.url, job.watcherConfig, { ...runtime, captureTimeoutMs: captureBudgetMs });
  } catch (error) {
    // A failed capture cannot produce useful evidence on an SQS retry after
    // the 900-second run deadline (the queue hides failed records for 1200s).
    // Report operational failures now, so the coordinator can refund this
    // region and show its actual error instead of a generic deadline expiry.
    if (isOperationalCaptureError(error)) return internalErrorResult(job, error);
    return targetOutageResult(job, error);
  }

  const previous = job.previousEvidence;
  const notes = [];
  const reasons = [];
  const outage = looksLikeErrorPage(capture.statusCode, capture.title, capture.visibleText);
  if (job.watcherConfig.methods.includes('outage') && outage.outage) {
    reasons.push({ method: 'outage', region, message: `${region}: ${outage.reason}`, value: capture.statusCode, threshold: null });
  }
  const detectedBannedMatches = job.watcherConfig.methods.includes('banned_phrase')
    ? findBannedPhrases(capture.visibleText, job.watcherConfig.bannedPhrases)
    : [];
  const bannedMatches = detectedBannedMatches.slice(0, 5).map((match) => ({
    phrase: String(match.phrase ?? '').slice(0, 250),
    quote: String(match.quote ?? '').slice(0, 400),
    index: Number(match.index ?? 0),
  }));
  if (bannedMatches.length) {
    reasons.push({ method: 'banned_phrase', region, message: `${region}: found banned phrase “${bannedMatches[0].phrase}”`, value: detectedBannedMatches.length, threshold: 1 });
  }

  const capturedAt = capture.capturedAt ?? new Date().toISOString();
  const cohort = capturedAt.slice(0, 7);
  const retention = retentionClass(job.retentionDays);
  const prefix = `capture-history/${retention}/${job.accountId}/${job.watcherId}/${region}/${cohort}`;
  const textHash = sha256(capture.visibleText);
  const textKey = `${prefix}/text/${textHash}.txt`;
  await putContentAddressed(textKey, Buffer.from(capture.visibleText), 'text/plain; charset=utf-8', job);

  let textPercent = null;
  let textDiff = null;
  let textCompared = false;
  if (previous && job.watcherConfig.methods.includes('text_change') && previous.textKey) {
    try {
      if (previous.textHash === textHash) {
        textPercent = 0;
        textDiff = { addedWords: 0, removedWords: 0, hunks: [], truncated: false };
      } else {
        const previousText = (await readReference({ key: previous.textKey, bucketName: previous.bucketName, region: previous.region })).toString('utf8');
        if (previous.textHash && sha256(previousText) !== previous.textHash) throw new Error('Previous text evidence does not match its immutable content hash.');
        textPercent = textChangePercent(previousText, capture.visibleText);
        textDiff = summarizeTextChanges(previousText, capture.visibleText);
      }
      textCompared = true;
      if (textPercent > 0 && textPercent >= job.watcherConfig.textThresholdPercent) {
        reasons.push({ method: 'text_change', region, message: `${region}: ${textPercent}% of normalized text changed`, value: textPercent, threshold: job.watcherConfig.textThresholdPercent });
      }
    } catch (error) {
      notes.push(`Text comparison unavailable for previous snapshot ${previous.snapshotId ?? 'unknown'}: ${String(error.message).slice(0, 400)}`);
    }
  } else if (previous && job.watcherConfig.methods.includes('text_change')) {
    notes.push(`Previous check ${previous.snapshotId ?? 'unknown'} did not contain captured text for ${region}.`);
  }

  const screenshots = [];
  for (const item of capture.screenshots ?? []) {
    const dimensions = imageDimensions(item.png);
    const screenshotHash = sha256(item.png);
    const profile = safeSegment(item.profile || 'desktop');
    const pngKey = `${prefix}/screenshots/${profile}/${screenshotHash}.png`;
    const previewKey = `${prefix}/previews/${profile}/${screenshotHash}.png`;
    const previousScreenshot = previous?.screenshots?.find((candidate) => candidate.profile === item.profile && candidate.fullPage !== false) ?? null;
    let comparisonAvailable = false;
    let pixelChangePercent = null;
    let dimensionsChanged = false;
    let dimensionChange = null;
    let overlay = null;
    if (previous && job.watcherConfig.methods.includes('pixel_change') && previousScreenshot?.pngKey) {
      try {
        if (previousScreenshot.screenshotHash === screenshotHash) {
          comparisonAvailable = true;
          pixelChangePercent = 0;
        } else {
          const previousPng = await readReference({
            key: previousScreenshot.pngKey,
            bucketName: previousScreenshot.bucketName ?? previous.bucketName,
            region: previousScreenshot.region ?? previous.region,
          });
          if (previousScreenshot.screenshotHash && sha256(previousPng) !== previousScreenshot.screenshotHash) throw new Error('Previous screenshot evidence does not match its immutable content hash.');
          const visual = await visualDiff(previousPng, item.png, dimensions.width, dimensions.height);
          comparisonAvailable = true;
          pixelChangePercent = visual.percent;
          dimensionsChanged = visual.dimensionsChanged;
          dimensionChange = visual.dimensionChange;
          overlay = visual.overlay;
        }
      } catch (error) {
        notes.push(`${region} ${String(item.label ?? profile).toLowerCase()} visual comparison unavailable: ${String(error.message).slice(0, 400)}`);
      }
    } else if (previous && job.watcherConfig.methods.includes('pixel_change')) {
      notes.push(`Previous check ${previous.snapshotId ?? 'unknown'} did not contain a ${region} ${String(item.label ?? profile).toLowerCase()} screenshot.`);
    }

    await putContentAddressed(pngKey, item.png, 'image/png', job);
    let previewReady = false;
    const existingPreview = await objectMetadata(previewKey);
    if (existingPreview) {
      previewReady = true;
      if (needsLifecycleRefresh(existingPreview, job.retentionDays)) {
        try { await refreshObjectLifecycle(previewKey, 'image/png', job); }
        catch (error) { if (!isNotFound(error)) throw error; previewReady = false; }
      }
    }
    if (!previewReady) {
      const preview = await makeReviewPreview(item.png);
      await putContentAddressed(previewKey, preview, 'image/png', job);
    }
    let diffKey = null;
    if (overlay) {
      const comparisonHash = sha256(`${previousScreenshot?.screenshotHash ?? 'unknown'}:${screenshotHash}`);
      diffKey = `${prefix}/diffs/${profile}/${comparisonHash}.png`;
      await putContentAddressed(diffKey, overlay, 'image/png', job);
    }
    screenshots.push({
      profile: item.profile, label: item.label,
      viewportWidth: item.viewportWidth, viewportHeight: item.viewportHeight,
      width: dimensions.width, height: dimensions.height, fullPage: item.fullPage !== false,
      pngKey, previewKey, diffKey, screenshotHash, pixelChangePercent,
      comparisonAvailable, dimensionsChanged, dimensionChange,
      bucketName, region,
    });
  }

  const compared = screenshots.filter((item) => item.comparisonAvailable);
  const pixelPercent = compared.length ? Math.max(...compared.map((item) => item.pixelChangePercent)) : null;
  const changed = screenshots.filter((item) => item.pixelChangePercent > 0 && item.pixelChangePercent >= job.watcherConfig.pixelThresholdPercent);
  if (changed.length) {
    reasons.push({
      method: 'pixel_change', region,
      message: `${region}: visual change crossed the ${job.watcherConfig.pixelThresholdPercent}% threshold: ${changed.map((item) => `${item.label} ${item.pixelChangePercent}%`).join(', ')}`,
      value: pixelPercent, threshold: job.watcherConfig.pixelThresholdPercent,
      profiles: changed.map((item) => ({ profile: item.profile, value: item.pixelChangePercent })),
    });
  }

  return {
    type: 'regional-capture-result', contractVersion: 1,
    jobId: job.jobId, runId: job.runId, snapshotId: job.snapshotId,
    accountId: job.accountId, watcherId: job.watcherId, region,
    status: 'success', capturedAt,
    capture: {
      statusCode: capture.statusCode, finalUrl: String(capture.finalUrl ?? '').slice(0, 2048), title: String(capture.title ?? '').slice(0, 500),
      durationMs: capture.durationMs,
    },
    evidence: { bucketName, region, textKey, textHash, screenshots },
    findings: {
      outage: outage.outage, reasons, bannedMatches,
      textChangePercent: textPercent, textDiff,
      pixelChangePercent: pixelPercent,
      textComparisonAvailable: textCompared,
      comparisonAvailable: textCompared || compared.length > 0,
      comparisonSnapshotId: previous?.snapshotId ?? null,
      comparisonCapturedAt: previous?.capturedAt ?? null,
      baselineEstablished: !previous,
    },
    comparisonNotes: notes,
  };
}

function targetOutageResult(job, error) {
  const message = String(error?.message ?? error).slice(0, 1000);
  return {
    type: 'regional-capture-result', contractVersion: 1,
    jobId: job.jobId, runId: job.runId, snapshotId: job.snapshotId,
    accountId: job.accountId, watcherId: job.watcherId, region,
    status: 'target_outage', capturedAt: new Date().toISOString(),
    capture: { statusCode: null, finalUrl: job.watcherConfig.url, title: '', durationMs: null },
    evidence: { bucketName, region, textKey: null, textHash: null, screenshots: [] },
    findings: {
      outage: true,
      reasons: [{ method: 'outage', region, message: `${region}: page could not be reached: ${message}`, value: null, threshold: null }],
      bannedMatches: [], textChangePercent: null, textDiff: null, pixelChangePercent: null, textComparisonAvailable: false, comparisonAvailable: false,
      comparisonSnapshotId: job.previousEvidence?.snapshotId ?? null, comparisonCapturedAt: job.previousEvidence?.capturedAt ?? null, baselineEstablished: !job.previousEvidence,
    },
    comparisonNotes: [],
    error: { code: String(error?.code ?? 'TARGET_UNREACHABLE').slice(0, 120), message },
  };
}

function internalErrorResult(job, error) {
  const message = String(error?.message ?? error).slice(0, 1000);
  return {
    type: 'regional-capture-result', contractVersion: 1,
    jobId: job.jobId, runId: job.runId, snapshotId: job.snapshotId,
    accountId: job.accountId, watcherId: job.watcherId, region,
    status: 'internal_error', capturedAt: new Date().toISOString(),
    capture: {
      statusCode: Number.isInteger(error?.primaryStatusCode) ? error.primaryStatusCode : null,
      finalUrl: job.watcherConfig.url, title: '', durationMs: null,
    },
    evidence: { bucketName, region, textKey: null, textHash: null, screenshots: [] },
    findings: {
      outage: false, reasons: [], bannedMatches: [], textChangePercent: null, textDiff: null, pixelChangePercent: null,
      textComparisonAvailable: false, comparisonAvailable: false,
      comparisonSnapshotId: job.previousEvidence?.snapshotId ?? null, comparisonCapturedAt: job.previousEvidence?.capturedAt ?? null, baselineEstablished: !job.previousEvidence,
    },
    comparisonNotes: [`${region} capture did not complete; ${message}`],
    error: { code: String(error?.code ?? 'CAPTURE_INTERNAL_ERROR').slice(0, 120), message, stage: String(error?.stage ?? '').slice(0, 120) },
  };
}

async function readCachedResult(job) {
  // Read the legacy key during rolling deployment, but bind all identities
  // before replaying it. New keys include watcher and job as well as run.
  for (const key of [resultKey(job), `run-results/${job.accountId}/${job.runId}/${region}.json`]) {
    try {
      const raw = await readReference({ key, bucketName, region });
      if (raw.length > 240_000) throw new Error('Cached regional capture result exceeds the transport budget.');
      const value = JSON.parse(raw.toString('utf8'));
      assertResultBinding(value, job);
      return value;
    } catch (error) {
      if (isNotFound(error)) continue;
      throw error;
    }
  }
  return null;
}

async function writeResult(job, result) {
  assertResultBinding(result, job);
  const body = Buffer.from(JSON.stringify(result));
  if (body.length > 240_000) throw Object.assign(new Error('Regional capture metadata exceeds the SQS result size budget.'), { code: 'CAPTURE_RESULT_TOO_LARGE' });
  try {
    await putObject(resultKey(job), body, 'application/json', job, 'no-store', true);
    return result;
  } catch (error) {
    if (isConditionalConflict(error)) {
      // SQS can deliver the same job concurrently. The first durable result
      // wins; a later browser must never overwrite or send another version.
      const winner = await readCachedResult(job);
      if (!winner) throw new Error('The immutable regional result disappeared during a concurrent commit.');
      return winner;
    }
    throw error;
  }
}

function boundedTransportResult(result) {
  if (Buffer.byteLength(JSON.stringify(result)) <= 220_000) return result;
  const compact = structuredClone(result);
  if (compact.findings?.textDiff) {
    compact.findings.textDiff = {
      addedWords: Number(compact.findings.textDiff.addedWords ?? 0),
      removedWords: Number(compact.findings.textDiff.removedWords ?? 0),
      hunks: [],
      truncated: true,
    };
  }
  if (Array.isArray(compact.findings?.bannedMatches)) compact.findings.bannedMatches = compact.findings.bannedMatches.slice(0, 5);
  if (Array.isArray(compact.findings?.reasons)) {
    compact.findings.reasons = compact.findings.reasons.slice(0, 20).map((reason) => ({ ...reason, message: String(reason.message ?? '').slice(0, 700) }));
  }
  compact.comparisonNotes = [...(compact.comparisonNotes ?? []), 'Representative text excerpts were omitted to keep the durable regional result within its transport budget.'].slice(0, 20);
  if (Buffer.byteLength(JSON.stringify(compact)) > 240_000) {
    throw Object.assign(new Error('Regional capture metadata remains above the durable transport budget after compaction.'), { code: 'CAPTURE_RESULT_TOO_LARGE' });
  }
  return compact;
}

async function sendResult(job, result) {
  const { SendMessageCommand, SQSClient } = await import('@aws-sdk/client-sqs');
  resultSqs ??= new SQSClient({ region: job.resultQueueRegion });
  await resultSqs.send(new SendMessageCommand({ QueueUrl: job.resultQueueUrl, MessageGroupId: fairQueueGroupId(job.accountId), MessageBody: JSON.stringify(result) }));
}

async function readReference(reference) {
  const { GetObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
  const client = await s3For(reference.region ?? region);
  const response = await client.send(new GetObjectCommand({ Bucket: reference.bucketName ?? bucketName, Key: reference.key }));
  if (typeof response.Body?.transformToByteArray === 'function') return Buffer.from(await response.Body.transformToByteArray());
  const chunks = [];
  for await (const chunk of response.Body ?? []) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function putContentAddressed(key, body, contentType, job) {
  const existing = await objectMetadata(key);
  if (existing) {
    let vanished = false;
    if (needsLifecycleRefresh(existing, job.retentionDays)) {
      try {
        await refreshObjectLifecycle(key, contentType, job);
      } catch (error) {
        if (!isNotFound(error)) throw error;
        vanished = true;
      }
    }
    if (!vanished) return key;
  }
  try {
    return await putObject(key, body, contentType, job, 'private, max-age=31536000, immutable', true);
  } catch (error) {
    if (isConditionalConflict(error) && await objectMetadata(key)) return key;
    throw error;
  }
}

async function refreshObjectLifecycle(key, contentType, job) {
  const { CopyObjectCommand } = await import('@aws-sdk/client-s3');
  const copySource = `${bucketName}/${key.split('/').map(encodeURIComponent).join('/')}`;
  await (await s3For(region)).send(new CopyObjectCommand({
    Bucket: bucketName, Key: key, CopySource: copySource,
    MetadataDirective: 'REPLACE', ContentType: contentType,
    CacheControl: 'private, max-age=31536000, immutable',
    Metadata: { account: job.accountId, watcher: job.watcherId, run: job.runId },
  }));
}

async function putObject(key, body, contentType, job, cacheControl = 'private, max-age=300', ifAbsent = false) {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  await (await s3For(region)).send(new PutObjectCommand({
    Bucket: bucketName, Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl,
    ...(ifAbsent ? { IfNoneMatch: '*' } : {}),
    Metadata: { account: job.accountId, watcher: job.watcherId, run: job.runId },
  }));
  return key;
}

async function objectMetadata(key) {
  const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
  try {
    return await (await s3For(region)).send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

function needsLifecycleRefresh(metadata, retentionDays) {
  if (retentionDays == null) return false;
  const modifiedAt = new Date(metadata?.LastModified ?? 0).getTime();
  return !Number.isFinite(modifiedAt) || Date.now() - modifiedAt >= 24 * 60 * 60_000;
}

async function s3For(targetRegion) {
  if (targetRegion === region && localS3) return localS3;
  if (regionalS3.has(targetRegion)) return regionalS3.get(targetRegion);
  const { S3Client } = await import('@aws-sdk/client-s3');
  const client = new S3Client({ region: targetRegion });
  regionalS3.set(targetRegion, client);
  if (targetRegion === region) localS3 = client;
  return client;
}

function validateJob(value) {
  if (value?.type !== 'regional-capture' || Number(value.contractVersion) !== 1) throw new Error('Unsupported regional capture job contract.');
  if (Buffer.byteLength(JSON.stringify(value)) > 240_000) throw new Error('Regional capture job exceeds its metadata budget.');
  for (const field of ['jobId', 'runId', 'snapshotId', 'accountId', 'watcherId']) {
    if (!/^[A-Za-z0-9_-]{3,180}$/.test(String(value[field] ?? ''))) throw new Error(`Regional capture job has an invalid ${field}.`);
  }
  if (value.region !== region) throw new Error(`Regional capture job for ${value.region ?? 'unknown'} reached ${region}.`);
  if (!/^https?:\/\//i.test(String(value.watcherConfig?.url ?? ''))) throw new Error('Regional capture job has an invalid watcher URL.');
  if (!Array.isArray(value.watcherConfig?.methods)) throw new Error('Regional capture job has invalid monitoring methods.');
  if (value.watcherConfigHash && value.watcherConfigHash !== sha256(canonicalJson(value.watcherConfig))) throw new Error('Regional capture job configuration does not match its immutable hash.');
  if (!/^https:\/\/[A-Za-z0-9.-]+\/\d+\/[A-Za-z0-9_-]+$/.test(String(value.resultQueueUrl ?? ''))) throw new Error('Regional capture job has an invalid result queue URL.');
  if (!/^[a-z]{2}(?:-gov)?-[a-z]+-\d$/.test(String(value.resultQueueRegion ?? ''))) throw new Error('Regional capture job has an invalid result queue region.');
  if (value.resultQueueUrl !== resultQueueUrl || value.resultQueueRegion !== resultQueueRegion) {
    throw Object.assign(new Error('Regional capture job cannot override the configured coordinator result queue.'), { code: 'CAPTURE_JOB_BINDING_MISMATCH' });
  }
  if (value.deadlineAt && !Number.isFinite(new Date(value.deadlineAt).getTime())) throw new Error('Regional capture job has an invalid run deadline.');
  const previous = value.previousEvidence;
  if (previous) {
    if (!/^[A-Za-z0-9_-]{3,180}$/.test(String(previous.snapshotId ?? ''))) throw new Error('Previous capture evidence has an invalid snapshot binding.');
    if (previous.capturedAt && !Number.isFinite(new Date(previous.capturedAt).getTime())) throw new Error('Previous capture evidence has an invalid capture time.');
    if (previous.textKey) {
      assertEvidenceReference({ key: previous.textKey, bucketName: previous.bucketName, region: previous.region }, value, { previous: true });
      assertContentHashReference(previous.textKey, previous.textHash);
    }
    const profiles = new Set();
    for (const screenshot of previous.screenshots ?? []) {
      if (!['desktop', 'tablet', 'mobile'].includes(screenshot.profile) || profiles.has(screenshot.profile)) throw new Error('Previous capture evidence has an invalid or repeated responsive profile.');
      profiles.add(screenshot.profile);
      if (screenshot.pngKey) {
        assertEvidenceReference({ key: screenshot.pngKey, bucketName: screenshot.bucketName ?? previous.bucketName, region: screenshot.region ?? previous.region }, value, { previous: true });
        assertContentHashReference(screenshot.pngKey, screenshot.screenshotHash);
      }
    }
  }
  return deepFreeze(structuredClone(value));
}

function assertResultBinding(result, job) {
  if (result?.type !== 'regional-capture-result' || Number(result.contractVersion) !== 1 || !['success', 'target_outage', 'internal_error'].includes(result.status)) throw new Error('Cached regional capture result has an invalid contract.');
  for (const field of ['jobId', 'runId', 'snapshotId', 'accountId', 'watcherId']) {
    if (result[field] !== job[field]) throw Object.assign(new Error(`Cached regional capture result has a different ${field}.`), { code: 'CAPTURE_RESULT_BINDING_MISMATCH' });
  }
  if (result.region !== region || result.evidence?.bucketName !== bucketName || result.evidence?.region !== region) throw new Error('Cached regional capture result has a different evidence location.');
  if (result.jobFingerprint && result.jobFingerprint !== jobFingerprint(job)) throw new Error('Cached regional capture result was produced for different immutable job inputs.');
  if (result.watcherConfigHash && result.watcherConfigHash !== job.watcherConfigHash) throw new Error('Cached regional capture result was produced for a different watcher configuration.');
  const profiles = result.evidence.screenshots ?? [];
  if (!Array.isArray(profiles) || (result.status === 'success' && (profiles.length !== 3 || !result.evidence.textKey)) || (result.status !== 'success' && (profiles.length || result.evidence.textKey))) throw new Error('Cached regional capture result has an incomplete evidence set.');
  if (new Set(profiles.map((item) => item.profile)).size !== profiles.length || profiles.some((item) => !['desktop', 'tablet', 'mobile'].includes(item.profile))) throw new Error('Cached regional capture result has an invalid responsive profile set.');
  if (result.evidence.textKey) assertEvidenceReference({ key: result.evidence.textKey, bucketName, region }, job);
  for (const screenshot of result.evidence.screenshots ?? []) {
    for (const key of [screenshot.pngKey, screenshot.previewKey, screenshot.diffKey].filter(Boolean)) {
      assertEvidenceReference({ key, bucketName: screenshot.bucketName ?? bucketName, region: screenshot.region ?? region }, job);
    }
  }
}

function assertEvidenceReference(reference, job, { previous = false } = {}) {
  const key = String(reference.key ?? '');
  if (!key || key.length > 1024 || key.includes('..') || /[\\\u0000-\u001f]/.test(key)) throw new Error('Capture evidence has an unsafe key.');
  const targetBucket = reference.bucketName ?? bucketName;
  const targetRegion = reference.region ?? region;
  const local = targetBucket === bucketName && targetRegion === region;
  const legacy = previous && targetBucket === legacyBucketName && targetRegion === legacyBucketRegion;
  if (!local && !legacy) throw Object.assign(new Error('Capture evidence cannot point to an unconfigured bucket or region.'), { code: 'CAPTURE_EVIDENCE_BINDING_MISMATCH' });
  const historyPrefixes = ['7', '30', '90', '180', '365', 'indefinite'].map((retention) => `capture-history/${retention}/${job.accountId}/${job.watcherId}/${region}/`);
  const baselinePrefix = `baselines/${job.accountId}/${job.watcherId}/${region}/`;
  const modern = local && (historyPrefixes.some((prefix) => key.startsWith(prefix)) || (previous && key.startsWith(baselinePrefix)));
  const legacyHistoryPrefix = `history/${job.accountId}/${job.watcherId}/${job.previousEvidence?.snapshotId}/`;
  const legacyHistoryFile = new RegExp(`^(?:source(?:-(?:tablet|mobile)|-${region}-(?:desktop|tablet|mobile))?\\.png|visible(?:-${region})?\\.txt)$`);
  const legacyHistory = legacy && key.startsWith(legacyHistoryPrefix) && legacyHistoryFile.test(key.slice(legacyHistoryPrefix.length));
  const legacyBaselinePrefix = `baselines/${job.accountId}/${job.watcherId}/`;
  const legacyBaseline = legacy && key.startsWith(legacyBaselinePrefix) && /^(?:source(?:-(?:tablet|mobile))?\.png|visible\.txt)$/.test(key.slice(legacyBaselinePrefix.length));
  if (!modern && !legacyHistory && !legacyBaseline) throw Object.assign(new Error('Capture evidence does not belong to this account, watcher and region.'), { code: 'CAPTURE_EVIDENCE_BINDING_MISMATCH' });
  return reference;
}

function deepFreeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value); }
  return value;
}
function assertContentHashReference(key, hash) {
  if (!hash) return;
  if (!/^[a-f0-9]{64}$/.test(String(hash))) throw new Error('Capture evidence has an invalid content hash.');
  const addressedHash = String(key).match(/\/([a-f0-9]{64})\.(?:png|txt)$/)?.[1];
  if (addressedHash && addressedHash !== hash) throw new Error('Capture evidence key differs from its declared immutable hash.');
}
function jobFingerprint(job) {
  return sha256(canonicalJson(job));
}
function resultKey(job) { return `run-results/${job.accountId}/${job.watcherId}/${job.jobId}/${job.runId}/${region}.json`; }
function isConditionalConflict(error) { return [409, 412].includes(error?.$metadata?.httpStatusCode) || ['PreconditionFailed', 'ConditionalRequestConflict'].includes(error?.name); }
function safeSegment(value) { return String(value).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 80) || 'desktop'; }
function retentionClass(days) {
  if (days == null) return 'indefinite';
  const value = Number(days);
  return [7, 30, 90, 180, 365].includes(value) ? String(value) : '90';
}
function isNotFound(error) { return ['NotFound', 'NoSuchKey'].includes(error?.name) || error?.$metadata?.httpStatusCode === 404; }
function integerEnvironment(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}

export const regionalCaptureWorkerInternals = Object.freeze({ validateJob, retentionClass, targetOutageResult, internalErrorResult, needsLifecycleRefresh, boundedTransportResult, assertResultBinding, assertEvidenceReference, resultKey, jobFingerprint });
