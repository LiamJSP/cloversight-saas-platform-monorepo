import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getAwsRuntime } from './runtime.mjs';
import { parseInboundEmail } from '../notifications/inbound-email.mjs';
import { safeSesReceiptVerdicts, sesVerdictSummary } from '../notifications/ses-verdicts.mjs';

const s3 = new S3Client({ region: process.env.SES_REGION ?? process.env.AWS_REGION ?? 'us-east-1' });

export async function handler(event) {
  const runtime = await getAwsRuntime('inbound-email');
  const results = [];
  for (const record of event?.Records ?? []) {
    const mail = record.ses?.mail;
    const receipt = record.ses?.receipt;
    const messageId = mail?.messageId;
    if (!messageId) continue;
    if (!safeSesReceiptVerdicts(receipt)) {
      runtime.logger.warn('ses.inbound.verdict_rejected', { messageId, verdicts: sesVerdictSummary(receipt) });
      results.push({ messageId, rejected: true, reason: 'authentication_or_content_verdict' });
      continue;
    }
    const key = `${process.env.INBOUND_MAIL_PREFIX ?? 'raw/'}${messageId}`;
    try {
      const object = await s3.send(new GetObjectCommand({ Bucket: runtime.config.inboundMailBucketName, Key: key }));
      if (Number(object.ContentLength ?? 0) > MAX_INBOUND_BYTES) { object.Body?.destroy?.(); throw oversizedReply(); }
      const raw = await bodyBuffer(object.Body);
      const parsed = await parseInboundEmail(raw);
      const outcome = await runtime.notifier.recordInboundReply({
        channel: 'email',
        sender: parsed.sender,
        body: parsed.text,
        code: parsed.responseCode,
        providerMessageId: messageId,
      });
      runtime.logger.info('ses.inbound.recorded', { messageId, alertId: outcome.alertId, duplicate: Boolean(outcome.duplicate) });
      results.push({ messageId, alertId: outcome.alertId, duplicate: Boolean(outcome.duplicate) });
    } catch (error) {
      if (['INVALID_REPLY', 'REPLY_NOT_FOUND', 'AMBIGUOUS_REPLY'].includes(error.code) || [400, 404, 409].includes(error.statusCode)) {
        runtime.logger.warn('ses.inbound.rejected', { messageId, code: error.code ?? 'invalid_reply' });
        results.push({ messageId, rejected: true, reason: error.code ?? 'invalid_reply' });
        continue;
      }
      throw error;
    }
  }
  return { processed: results.length, results };
}

const MAX_INBOUND_BYTES = 5_000_000;
async function bodyBuffer(body) {
  if (body?.[Symbol.asyncIterator]) {
    const chunks = []; let bytes = 0;
    for await (const chunk of body) { const buffer = Buffer.from(chunk); bytes += buffer.length; if (bytes > MAX_INBOUND_BYTES) { body.destroy?.(); throw oversizedReply(); } chunks.push(buffer); }
    return Buffer.concat(chunks, bytes);
  }
  if (typeof body?.transformToByteArray === 'function') {
    const buffer = Buffer.from(await body.transformToByteArray());
    if (buffer.length > MAX_INBOUND_BYTES) throw oversizedReply();
    return buffer;
  }
  return Buffer.alloc(0);
}
function oversizedReply() { return Object.assign(new Error('Inbound email exceeds the maximum size.'), { code: 'INVALID_REPLY', statusCode: 400 }); }

export const inboundEmailInternals = Object.freeze({ safeVerdicts: safeSesReceiptVerdicts, verdictSummary: sesVerdictSummary });
