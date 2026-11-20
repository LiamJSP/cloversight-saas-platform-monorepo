import { redactLogDetails, redactLogText } from './security/log-redaction.mjs';

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });

export function createLogger(level = 'info') {
  const threshold = LEVELS[level] ?? LEVELS.info;
  const emit = (name, event, details = {}) => {
    if ((LEVELS[name] ?? 99) < threshold) return;
    const record = { ...redactLogDetails(details), time: new Date().toISOString(), level: name, event: redactLogText(event) };
    const line = JSON.stringify(record);
    (name === 'error' ? console.error : name === 'warn' ? console.warn : console.log)(line);
  };
  return Object.freeze({
    debug: (event, details) => emit('debug', event, details),
    info: (event, details) => emit('info', event, details),
    warn: (event, details) => emit('warn', event, details),
    error: (event, details) => emit('error', event, details),
  });
}
