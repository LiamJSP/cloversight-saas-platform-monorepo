// AWS must never fall back to the publicly known local signing key.
export function assertAwsSecrets(mode, { responseSecret = {}, originSecret = {} } = {}) {
  if (mode !== 'report' && !strongSecret(responseSecret.integritySecret)) {
    throw new Error('AWS requires a configured response signing secret from Secrets Manager.');
  }
  if (mode === 'api' && !strongSecret(originSecret.originVerifySecret)) {
    throw new Error('AWS requires a configured CloudFront origin secret from Secrets Manager.');
  }
}

function strongSecret(value) {
  return typeof value === 'string' && value.length >= 32 && !value.startsWith('local-only-');
}

// Chromium needs native-library/font paths, not the parent's AWS credentials,
// runtime API endpoint, provider keys or arbitrary application configuration.
// This reduces inheritance; same-UID processes are not a security sandbox.
export function browserEnvironment(source = process.env) {
  return Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'TZ',
    'LD_LIBRARY_PATH', 'FONTCONFIG_PATH', 'FONTCONFIG_FILE', 'XDG_CACHE_HOME',
  ].filter((key) => typeof source[key] === 'string').map((key) => [key, source[key]]));
}
