import fs from 'node:fs/promises';
import path from 'node:path';

export class LocalAssets {
  constructor(rootPath) { this.rootPath = rootPath; }
  async initialize() { await fs.mkdir(this.rootPath, { recursive: true }); }
  resolve(key) {
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const base = path.resolve(this.rootPath);
    const absolute = path.resolve(base, normalized);
    if (absolute !== base && !absolute.startsWith(`${base}${path.sep}`)) throw new Error('Unsafe asset key.');
    return absolute;
  }
  async put(key, data) { const file = this.resolve(key); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data); return key; }
  async copy(sourceKey, targetKey) { const target = this.resolve(targetKey); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.copyFile(this.resolve(sourceKey), target); return targetKey; }
  async read(key) { return fs.readFile(this.resolve(key)); }
  async remove(key) { await fs.rm(this.resolve(key), { force: true }); }
  async exists(key) { try { await fs.access(this.resolve(key)); return true; } catch { return false; } }
  async removeWatcher(accountId, watcherId) {
    const account = String(accountId); const watcher = String(watcherId);
    if (!/^[A-Za-z0-9_-]+$/.test(account) || !/^[A-Za-z0-9_-]+$/.test(watcher)) throw new Error('Unsafe watcher asset identifier.');
    await Promise.all([
      fs.rm(this.resolve(`history/${account}/${watcher}`), { recursive: true, force: true }),
      fs.rm(this.resolve(`baselines/${account}/${watcher}`), { recursive: true, force: true }),
    ]);
  }
  async removeAccount(accountId) {
    const safe = String(accountId);
    if (!/^[A-Za-z0-9_-]+$/.test(safe)) throw new Error('Unsafe account asset identifier.');
    await Promise.all([
      fs.rm(this.resolve(`history/${safe}`), { recursive: true, force: true }),
      fs.rm(this.resolve(`baselines/${safe}`), { recursive: true, force: true }),
      fs.rm(this.resolve(`reports/${safe}`), { recursive: true, force: true }),
    ]);
  }
  async cleanupHistory(cutoff) {
    const history = this.resolve('history');
    let removed = 0;
    const walk = async (dir) => {
      let entries;
      try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(file);
        else {
          const stat = await fs.stat(file);
          if (stat.mtime < cutoff) { await fs.rm(file, { force: true }); removed += 1; }
        }
      }
    };
    await walk(history);
    return removed;
  }
}
