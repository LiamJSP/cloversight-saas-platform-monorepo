import { capacityPlan } from '../src/deployment/capacity.mjs';
const options = {};
const flags = { '--watchers': 'watchers', '--interval': 'intervalSeconds', '--regions': 'regions', '--mean-seconds': 'meanSeconds', '--p95-seconds': 'p95Seconds', '--memory-gb': 'memoryGb', '--concurrency': 'concurrency', '--utilization': 'utilization', '--days': 'days', '--credits': 'credits', '--mean-mib': 'meanMiB', '--gb-second-usd': 'gbSecondUsd', '--margin': 'margin' };
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  if (!flags[args[i]] || args[i + 1] == null) throw new Error(`Use numeric flag/value pairs: ${Object.keys(flags).join(', ')}`);
  options[flags[args[i]]] = Number(args[i + 1]);
}
console.log(JSON.stringify({ model: 'Illustrative; replace duration, byte and unit-price inputs with measured/current values.', ...capacityPlan(options) }, null, 2));
