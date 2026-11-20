import { ISO } from '../lib.mjs';
import { fairWatcherOrder } from '../aws/queue-pressure.mjs';
export class Scheduler {
  constructor({ store, engine, logger, intervalMs = 15000 }) { Object.assign(this, { store, engine, logger, intervalMs }); this.running = false; this.timer = null; }
  start() { if (this.timer) return; this.timer = setInterval(() => void this.tick(), this.intervalMs); this.timer.unref(); void this.tick(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  async tick() {
    if (this.running) return; this.running = true;
    try {
      const now = ISO();
      const candidates = typeof this.store.dueWatchers === 'function' ? await this.store.dueWatchers(now, 100)
        : (await this.store.read()).watchers.filter((w) => w.status === 'active' && w.nextCheckAt <= now);
      const due = fairWatcherOrder(candidates, now).slice(0, 10);
      for (const watcher of due) {
        try { await this.engine.check(watcher.id); } catch (error) { this.logger.error('scheduler.check.failed', { watcherId: watcher.id, message: error.message }); }
      }
    } finally { this.running = false; }
  }
}
