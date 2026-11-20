import { fairQueueGroupId } from '../lib.mjs';
import { queuePressure } from './queue-pressure.mjs';

/**
 * Resolves the same deterministic capture-queue name in each configured AWS
 * Region. Lambda and SQS event sources remain co-located while the central
 * coordinator can submit jobs cross-region with ordinary SigV4 credentials.
 */
export class RegionalCaptureDispatcher {
  constructor({ queueName, accountId, resultQueueUrl, resultQueueRegion, logger, config = {} }) {
    if (!queueName || !accountId || !resultQueueUrl || !resultQueueRegion) throw new Error('Regional capture queue configuration is incomplete.');
    Object.assign(this, { queueName, accountId, resultQueueUrl, resultQueueRegion, logger, config });
    this.clients = new Map();
    this.queueUrls = new Map();
    this.pressures = new Map();
  }

  async #queue(region) {
    const { GetQueueUrlCommand, SQSClient } = await import('@aws-sdk/client-sqs');
    let client = this.clients.get(region);
    if (!client) { client = new SQSClient({ region }); this.clients.set(region, client); }
    let queueUrl = this.queueUrls.get(region);
    if (!queueUrl) {
      const result = await client.send(new GetQueueUrlCommand({ QueueName: this.queueName, QueueOwnerAWSAccountId: this.accountId }));
      queueUrl = result.QueueUrl;
      if (!queueUrl) throw Object.assign(new Error(`Capture queue ${this.queueName} was not found in ${region}.`), { code: 'CAPTURE_QUEUE_NOT_FOUND' });
      this.queueUrls.set(region, queueUrl);
    }
    return { client, queueUrl };
  }

  async admission(regions) {
    const unique = [...new Set(regions)];
    const limit = Number(this.config.captureQueueMaxOutstanding ?? 256);
    const cacheMs = Number(this.config.captureQueueHealthCacheSeconds ?? 10) * 1000;
    const results = await Promise.allSettled(unique.map(async (region) => {
      let pressure = this.pressures.get(region);
      if (!pressure || Date.now() - Date.parse(pressure.observedAt) > cacheMs) {
        const { client, queueUrl } = await this.#queue(region);
        pressure = await queuePressure(client, queueUrl);
        this.pressures.set(region, pressure);
      }
      const outstanding = pressure.outstanding + pressure.admissionsSinceObservation;
      return { region, allowed: outstanding + 1 <= limit, outstanding, limit, observedAt: pressure.observedAt };
    }));
    const byRegion = Object.fromEntries(results.map((result, index) => {
      if (result.status === 'fulfilled') return [unique[index], result.value];
      const region = unique[index];
      const errorCode = result.reason?.code ?? result.reason?.name ?? 'QUEUE_HEALTH_UNAVAILABLE';
      this.logger?.warn?.('capture.queue.health_unavailable', { region, errorCode });
      return [region, { region, allowed: false, outstanding: null, limit, observedAt: null, errorCode }];
    }));
    return { allowed: Object.values(byRegion).every((row) => row.allowed), byRegion, blockedRegions: Object.values(byRegion).filter((row) => !row.allowed).map((row) => row.region) };
  }

  async send(region, payload) {
    const { SendMessageCommand } = await import('@aws-sdk/client-sqs');
    const { client, queueUrl } = await this.#queue(region);
    await client.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageGroupId: fairQueueGroupId(payload.accountId),
      MessageBody: JSON.stringify({
        type: 'regional-capture',
        contractVersion: 1,
        ...payload,
        region,
        resultQueueUrl: this.resultQueueUrl,
        resultQueueRegion: this.resultQueueRegion,
      }),
    }));
    const pressure = this.pressures.get(region);
    if (pressure) pressure.admissionsSinceObservation += 1;
    this.logger?.info?.('capture.job.dispatched', { runId: payload.runId, jobId: payload.jobId, watcherId: payload.watcherId, region });
  }
}
