/**
 * Fail-closed gate for automatic alert votes received through Amazon SES.
 *
 * SPF and DKIM PASS values alone do not prove alignment to the visible From
 * address. DMARC PASS supplies that alignment decision, so messages without a
 * passing DMARC verdict must use the signed browser response flow instead.
 */
export function safeSesReceiptVerdicts(receipt = {}) {
  const virus = receipt.virusVerdict?.status;
  const spam = receipt.spamVerdict?.status;
  return virus !== 'FAIL' && spam !== 'FAIL' && receipt.dmarcVerdict?.status === 'PASS';
}

export function sesVerdictSummary(receipt = {}) {
  return {
    spam: receipt.spamVerdict?.status,
    virus: receipt.virusVerdict?.status,
    spf: receipt.spfVerdict?.status,
    dkim: receipt.dkimVerdict?.status,
    dmarc: receipt.dmarcVerdict?.status,
  };
}
