export const historyPrefix = (accountId, watcherId) => `history/${accountId}/${watcherId}`;
export const snapshotPngKey = (accountId, watcherId, snapshotId, profile = 'desktop') => `${historyPrefix(accountId, watcherId)}/${snapshotId}/${profile === 'desktop' ? 'source.png' : `source-${profile}.png`}`;
export const snapshotPreviewKey = (accountId, watcherId, snapshotId, profile = 'desktop') => `${historyPrefix(accountId, watcherId)}/${snapshotId}/${profile === 'desktop' ? 'preview.png' : `preview-${profile}.png`}`;
export const snapshotDiffKey = (accountId, watcherId, snapshotId, profile = 'desktop') => `${historyPrefix(accountId, watcherId)}/${snapshotId}/${profile === 'desktop' ? 'diff.png' : `diff-${profile}.png`}`;
export const snapshotTextKey = (accountId, watcherId, snapshotId) => `${historyPrefix(accountId, watcherId)}/${snapshotId}/visible.txt`;
export const snapshotRegionTextKey = (accountId, watcherId, snapshotId, region) => `${historyPrefix(accountId, watcherId)}/${snapshotId}/visible-${String(region).replace(/[^a-z0-9-]/g, '')}.txt`;
export const baselinePngKey = (accountId, watcherId, profile = 'desktop') => `baselines/${accountId}/${watcherId}/${profile === 'desktop' ? 'source.png' : `source-${profile}.png`}`;
export const baselineTextKey = (accountId, watcherId) => `baselines/${accountId}/${watcherId}/visible.txt`;
