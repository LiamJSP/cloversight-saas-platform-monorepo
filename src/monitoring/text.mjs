function decodeEntities(value) {
  const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x?[0-9a-f]+|\w+);/gi, (_, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : ' ';
    }
    return map[entity.toLowerCase()] ?? ' ';
  });
}

export function htmlToVisibleText(html) {
  return decodeEntities(String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' '));
}

export function normalizeText(text) {
  return String(text).normalize('NFKC').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function shingles(text, size = 5) {
  const words = normalizeText(text).toLocaleLowerCase().split(' ').filter(Boolean);
  if (words.length < size) return new Set(words);
  const result = new Set();
  for (let i = 0; i <= words.length - size; i += 1) result.add(words.slice(i, i + size).join(' '));
  return result;
}

export function textChangePercent(previous, current) {
  const a = shingles(previous);
  const b = shingles(current);
  if (!a.size && !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  const union = a.size + b.size - intersection;
  return Number(((1 - intersection / Math.max(1, union)) * 100).toFixed(3));
}

export function summarizeTextChanges(previous, current, options = {}) {
  const before = normalizeText(previous).split(' ').filter(Boolean);
  const after = normalizeText(current).split(' ').filter(Boolean);
  if (before.join(' ') === after.join(' ')) return { addedWords: 0, removedWords: 0, hunks: [], truncated: false };
  const maxTokens = Math.max(100, Math.min(1600, Number(options.maxTokens ?? 1000)));
  const maxHunks = Math.max(1, Math.min(12, Number(options.maxHunks ?? 6)));
  if (before.length <= maxTokens && after.length <= maxTokens) return lcsSummary(before, after, maxHunks);
  return boundedSummary(before, after, maxHunks);
}

function lcsSummary(before, after, maxHunks) {
  const rows = Array.from({ length: before.length + 1 }, () => new Uint16Array(after.length + 1));
  for (let left = before.length - 1; left >= 0; left -= 1) {
    for (let right = after.length - 1; right >= 0; right -= 1) {
      rows[left][right] = before[left] === after[right]
        ? rows[left + 1][right + 1] + 1
        : Math.max(rows[left + 1][right], rows[left][right + 1]);
    }
  }
  const operations = [];
  let left = 0; let right = 0;
  while (left < before.length || right < after.length) {
    if (left < before.length && right < after.length && before[left] === after[right]) {
      operations.push({ type: 'equal', value: before[left] }); left += 1; right += 1;
    } else if (right < after.length && (left === before.length || rows[left][right + 1] >= rows[left + 1][right])) {
      operations.push({ type: 'added', value: after[right] }); right += 1;
    } else {
      operations.push({ type: 'removed', value: before[left] }); left += 1;
    }
  }
  return operationsSummary(operations, maxHunks, false);
}

function boundedSummary(before, after, maxHunks) {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1;
  const removedEnd = before.length - suffix;
  const addedEnd = after.length - suffix;
  const removed = compactTokens(before, { start: prefix, end: removedEnd });
  const added = compactTokens(after, { start: prefix, end: addedEnd });
  const contextBefore = compactTokens(before, { start: Math.max(0, prefix - 8), end: prefix, maxTokens: 8, maxCharacters: 720 });
  const contextAfter = compactTokens(after, { start: addedEnd, end: Math.min(after.length, addedEnd + 8), maxTokens: 8, maxCharacters: 720 });
  return {
    addedWords: Math.max(0, addedEnd - prefix),
    removedWords: Math.max(0, removedEnd - prefix),
    hunks: [{
      before: excerpt([...contextBefore.tokens, ...removed.tokens, ...contextAfter.tokens]),
      after: excerpt([...contextBefore.tokens, ...added.tokens, ...contextAfter.tokens]),
      removed: removed.tokens,
      added: added.tokens,
      beforeSegments: diffSegments(contextBefore.tokens, removed.tokens, contextAfter.tokens, 'removed'),
      afterSegments: diffSegments(contextBefore.tokens, added.tokens, contextAfter.tokens, 'added'),
    }].slice(0, maxHunks),
    truncated: true,
  };
}

function operationsSummary(operations, maxHunks, sourceTruncated) {
  const hunks = [];
  let addedWords = 0; let removedWords = 0;
  let contentTruncated = false;
  for (const operation of operations) {
    if (operation.type === 'added') addedWords += 1;
    if (operation.type === 'removed') removedWords += 1;
  }
  let cursor = 0;
  while (cursor < operations.length) {
    while (cursor < operations.length && operations[cursor].type === 'equal') cursor += 1;
    if (cursor >= operations.length) break;
    const start = cursor;
    while (cursor < operations.length && operations[cursor].type !== 'equal') cursor += 1;
    const leftContext = compactTokens(operations.slice(Math.max(0, start - 7), start).filter((item) => item.type === 'equal').map((item) => item.value), { maxTokens: 7, maxCharacters: 720 });
    const rightContext = compactTokens(operations.slice(cursor, cursor + 7).filter((item) => item.type === 'equal').map((item) => item.value), { maxTokens: 7, maxCharacters: 720 });
    const changed = operations.slice(start, cursor);
    const removed = compactTokens(changed.filter((item) => item.type === 'removed').map((item) => item.value));
    const added = compactTokens(changed.filter((item) => item.type === 'added').map((item) => item.value));
    contentTruncated ||= leftContext.truncated || rightContext.truncated || removed.truncated || added.truncated;
    hunks.push({
      before: excerpt([...leftContext.tokens, ...removed.tokens, ...rightContext.tokens]),
      after: excerpt([...leftContext.tokens, ...added.tokens, ...rightContext.tokens]),
      removed: removed.tokens,
      added: added.tokens,
      beforeSegments: diffSegments(leftContext.tokens, removed.tokens, rightContext.tokens, 'removed'),
      afterSegments: diffSegments(leftContext.tokens, added.tokens, rightContext.tokens, 'added'),
    });
  }
  return { addedWords, removedWords, hunks: hunks.slice(0, maxHunks), truncated: sourceTruncated || contentTruncated || hunks.length > maxHunks };
}

function compactTokens(values, options = {}) {
  const start = Math.max(0, Number(options.start ?? 0));
  const end = Math.min(values.length, Math.max(start, Number(options.end ?? values.length)));
  const maxTokens = Math.max(1, Number(options.maxTokens ?? 80));
  const maxCharacters = Math.max(1, Number(options.maxCharacters ?? 1024));
  const tokens = [];
  let characters = 0;
  let truncated = false;
  for (let index = start; index < end; index += 1) {
    if (tokens.length >= maxTokens) {
      truncated = true;
      break;
    }
    const original = String(values[index]);
    const token = original.length <= 180 ? original : `${original.slice(0, 179)}…`;
    if (token.length !== original.length) truncated = true;
    const separator = tokens.length ? 1 : 0;
    const remaining = maxCharacters - characters - separator;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    if (token.length > remaining) {
      tokens.push(remaining === 1 ? '…' : `${token.slice(0, remaining - 1)}…`);
      truncated = true;
      characters = maxCharacters;
      break;
    }
    tokens.push(token);
    characters += separator + token.length;
  }
  if (end - start > tokens.length) truncated = true;
  return { tokens, truncated };
}

function diffSegments(leftContext, changed, rightContext, changeType) {
  return [
    { type: 'context', text: excerpt(leftContext) },
    { type: changeType, text: excerpt(changed) },
    { type: 'context', text: excerpt(rightContext) },
  ].filter((segment) => segment.text);
}

function excerpt(words, maxCharacters = 360) {
  const value = words.join(' ');
  return value.length <= maxCharacters ? value : `${value.slice(0, maxCharacters - 1).trimEnd()}…`;
}

export function findBannedPhrases(text, phrases) {
  const source = normalizeText(text);
  const folded = source.toLocaleLowerCase();
  const matches = [];
  for (const candidate of phrases ?? []) {
    const phrase = normalizeText(candidate);
    if (!phrase) continue;
    let start = 0;
    while (matches.length < 50) {
      const index = folded.indexOf(phrase.toLocaleLowerCase(), start);
      if (index < 0) break;
      const left = Math.max(0, index - 45);
      const right = Math.min(source.length, index + phrase.length + 45);
      matches.push({ phrase, quote: source.slice(left, right), index });
      start = index + Math.max(1, phrase.length);
    }
  }
  return matches;
}

export function looksLikeErrorPage(status, title, text) {
  if (status >= 400) return { outage: true, reason: `HTTP ${status}` };
  const sample = `${title} ${text.slice(0, 5000)}`.toLocaleLowerCase();
  const patterns = [
    /\b(500|502|503|504)\b.{0,35}(error|unavailable|gateway)/,
    /service (temporarily )?unavailable/,
    /internal server error/,
    /bad gateway/,
    /gateway timeout/,
    /this site can['’]?t be reached/,
    /application error/,
    /temporarily down for maintenance/,
  ];
  const pattern = patterns.find((candidate) => candidate.test(sample));
  return pattern ? { outage: true, reason: 'Rendered error page detected' } : { outage: false, reason: null };
}
