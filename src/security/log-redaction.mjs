/** Bounded sanitization for operational logs, never for domain persistence. */
const REDACTED = '[redacted]';
const SENSITIVE_KEY = /authorization|cookie|password|secret|token|apikey|credential|rawbody|body|html|excerpt|recipient|email|phone|address|useragent|^(ip|text|content|stack|path|url|target)$/i;

export function redactLogDetails(value) {
  const seen = new WeakSet();
  function visit(item, depth = 0) {
    if (item == null || typeof item === 'boolean' || typeof item === 'number') return item;
    if (typeof item === 'bigint') return String(item);
    if (typeof item === 'string') return redactLogText(item);
    if (typeof item !== 'object') return String(item).slice(0, 1000);
    if (depth >= 6) return '[depth limit]';
    if (seen.has(item)) return '[circular]';
    seen.add(item);
    if (item instanceof Error) return { name: redactLogText(item.name), code: item.code ? redactLogText(String(item.code)) : undefined, message: redactLogText(item.message) };
    if (Array.isArray(item)) return item.slice(0, 50).map((child) => visit(child, depth + 1));
    const result = {};
    for (const [key, child] of Object.entries(item).slice(0, 80)) {
      const normalized = key.replace(/[^a-z0-9]/gi, '');
      result[key] = SENSITIVE_KEY.test(normalized) ? REDACTED : visit(child, depth + 1);
    }
    return result;
  }
  return visit(value);
}

export function redactLogText(value) {
  return String(value ?? '')
    .replace(/https?:\/\/[^\s<>"']+/gi, '[url redacted]')
    .replace(/\b(Bearer|Basic)\s+[^\s,;]+/gi, '$1 [redacted]')
    .replace(/\b(?:sk|rk|pk)_(?:live|test)_[a-z0-9]+\b/gi, REDACTED)
    .replace(/\b(?:whsec_[a-z0-9]+|AKIA[A-Z0-9]{16}|ASIA[A-Z0-9]{16})\b/gi, REDACTED)
    .replace(/\beyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+\b/gi, REDACTED)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email redacted]')
    .replace(/\+[1-9][0-9]{7,14}\b/g, '[phone redacted]')
    .replace(/\b(password|secret|token|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .slice(0, 1000);
}
