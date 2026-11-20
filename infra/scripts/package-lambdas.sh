#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="$ROOT/dist/lambda"
source "$ROOT/infra/scripts/lib.sh"
load_webwatch_env
[[ "$STAGE" != prod ]] || export WEBWATCH_REQUIRE_DEPENDENCY_LOCKS=1
for command in node npm zip; do command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 4; }; done
node "$ROOT/infra/runtime/dependency-evidence.mjs" check "$ROOT/infra/runtime"
rm -rf "$OUT" && mkdir -p "$OUT/runtime"
cp -R "$ROOT/src" "$OUT/runtime/src"
cp "$ROOT/infra/runtime/package.json" "$OUT/runtime/package.json"
if [[ -f "$ROOT/infra/runtime/package-lock.json" ]]; then cp "$ROOT/infra/runtime/package-lock.json" "$OUT/runtime/package-lock.json"; fi
(
  cd "$OUT/runtime"
  if [[ -f package-lock.json ]]; then
    npm ci --omit=dev --ignore-scripts --no-audit --no-fund
  else
    printf 'WARNING: Lambda dependencies are unlocked; record and review the generated tree before release.\n' >&2
    npm install --omit=dev --ignore-scripts --no-audit --no-fund
  fi
  npm sbom --omit=dev --sbom-format cyclonedx > ../runtime.sbom.cdx.json
  npm cache clean --force >/dev/null 2>&1 || true
  zip -qr ../runtime.zip .
)
node "$ROOT/infra/runtime/dependency-evidence.mjs" record --scope lambda --manifest "$ROOT/infra/runtime/package.json" --source-lock "$ROOT/infra/runtime/package-lock.json" --sbom "$OUT/runtime.sbom.cdx.json" --artifact "$OUT/runtime.zip" --output "$OUT/runtime.release-evidence.json"
node --input-type=module - "$OUT/runtime.zip" <<'NODE'
import fs from 'node:fs'; import crypto from 'node:crypto';
const file=process.argv[2]; const data=fs.readFileSync(file);
console.log(`Packaged ${file} (${data.length} bytes, sha256 ${crypto.createHash('sha256').update(data).digest('hex')})`);
NODE
