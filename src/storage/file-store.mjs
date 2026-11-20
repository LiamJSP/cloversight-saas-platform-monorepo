import fs from 'node:fs/promises';
import path from 'node:path';
import { emptyState } from '../domain/defaults.mjs';
import { clone, ISO } from '../lib.mjs';

export class FileStore {
  #queue = Promise.resolve();
  constructor(filePath, logger) { this.filePath = filePath; this.logger = logger; }

  async initialize() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try { await fs.access(this.filePath); }
    catch { await this.#write(emptyState()); }
  }

  async read() {
    const raw = await fs.readFile(this.filePath, 'utf8');
    const state = JSON.parse(raw);
    if (state.schemaVersion !== 2) throw new Error(`Unsupported local state schema ${state.schemaVersion}.`);
    // Additive schema-v2 collections must be available when an older local
    // state file is opened by a newer release.
    const defaults = emptyState(state.createdAt);
    for (const [key, value] of Object.entries(defaults)) if (Array.isArray(value) && !Array.isArray(state[key])) state[key] = [];
    return state;
  }

  async transact(label, mutate) {
    const operation = async () => {
      const state = await this.read();
      const before = state.revision;
      const result = await mutate(state);
      state.revision = before + 1;
      state.updatedAt = ISO();
      await this.#write(state);
      this.logger.debug('state.transaction.committed', { label, revision: state.revision });
      return clone(result);
    };
    const next = this.#queue.then(operation, operation);
    this.#queue = next.then(() => undefined, () => undefined);
    return next;
  }

  async #write(state) {
    const temp = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    await fs.rename(temp, this.filePath);
  }
}
