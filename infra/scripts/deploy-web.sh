#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=lib.sh
source "$ROOT/infra/scripts/lib.sh"
load_webwatch_env
WEBWATCH_ORIGINAL_ARGS=("$@")
for tool in aws node; do require_command "$tool"; done
assert_region
ensure_deployment_role
(cd "$ROOT" && node scripts/deployment-settings.mjs validate)
eval "$(cd "$ROOT" && node scripts/deployment-settings.mjs shell)"
PICO_CSS="$ROOT/node_modules/@picocss/pico/css/pico.conditional.min.css"
MANROPE_FONT="$ROOT/node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2"
[[ -f "$PICO_CSS" && -f "$MANROPE_FONT" ]] || { printf 'Portal dependencies are missing. Run npm ci before aws:deploy-web.\n' >&2; exit 4; }
(cd "$ROOT" && node scripts/build-regional-globe.mjs)

output(){ stack_output "$1"; }
PUBLIC_BUCKET="$(output PublicBucket)"; CUSTOMER_BUCKET="$(output CustomerBucket)"; STEWARD_BUCKET="$(output StewardBucket)"
CUSTOMER_CLIENT="$(output CustomerClientId)"; CUSTOMER_COGNITO="$(output CustomerCognitoDomain)"
STEWARD_CLIENT="$(output StewardClientId)"; STEWARD_COGNITO="$(output StewardCognitoDomain)"
export CUSTOMER_CLIENT CUSTOMER_COGNITO STEWARD_CLIENT STEWARD_COGNITO WW_PUBLIC_DOMAIN WW_CUSTOMER_DOMAIN WW_STEWARD_DOMAIN
mkdir -p "$ROOT/.local"
customer_config="$ROOT/.local/customer-runtime-config.json"
steward_config="$ROOT/.local/steward-runtime-config.json"
node --input-type=module - "$customer_config" "$steward_config" <<'NODE'
import fs from 'node:fs';
const [customerPath,stewardPath]=process.argv.slice(2);
const common={mode:'cognito',apiBaseUrl:''};
fs.writeFileSync(customerPath,JSON.stringify({...common,role:'customer',cognitoDomain:process.env.CUSTOMER_COGNITO,clientId:process.env.CUSTOMER_CLIENT,redirectUri:`https://${process.env.WW_PUBLIC_DOMAIN}/app/`,logoutUri:`https://${process.env.WW_PUBLIC_DOMAIN}/`}),{mode:0o600});
fs.writeFileSync(stewardPath,JSON.stringify({...common,role:'steward',cognitoDomain:process.env.STEWARD_COGNITO,clientId:process.env.STEWARD_CLIENT,redirectUri:`https://${process.env.WW_STEWARD_DOMAIN}/`,logoutUri:`https://${process.env.WW_STEWARD_DOMAIN}/`}),{mode:0o600});
NODE

aws_active s3 sync "$ROOT/apps/public" "s3://$PUBLIC_BUCKET" --delete --exclude 'static/*' --exclude 'favicon.svg' --exclude 'favicon-dark.svg' --cache-control 'no-cache' --only-show-errors
for file in styles.css theme.css brand.css theme.js site.js auth.js stage-globe.css; do aws_active s3 cp "$ROOT/apps/shared/$file" "s3://$PUBLIC_BUCKET/static/$file" --cache-control 'no-cache' --only-show-errors; done
aws_active s3 cp "$PICO_CSS" "s3://$PUBLIC_BUCKET/static/pico.css" --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$MANROPE_FONT" "s3://$PUBLIC_BUCKET/static/manrope.woff2" --cache-control 'public,max-age=31536000,immutable' --only-show-errors
aws_active s3 cp "$ROOT/apps/shared/favicon.svg" "s3://$PUBLIC_BUCKET/favicon.svg" --cache-control 'public,max-age=3600' --only-show-errors

aws_active s3 cp "$ROOT/apps/customer/index.html" "s3://$CUSTOMER_BUCKET/index.html" --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/app.js" "s3://$CUSTOMER_BUCKET/app-static/app.js" --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/locations.js" "s3://$CUSTOMER_BUCKET/app-static/locations.js" --cache-control 'no-cache' --content-type 'text/javascript' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/components.css" "s3://$CUSTOMER_BUCKET/app-static/components.css" --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/results-evidence.css" "s3://$CUSTOMER_BUCKET/app-static/results-evidence.css" --content-type 'text/css' --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/mobile-layout.css" "s3://$CUSTOMER_BUCKET/app-static/mobile-layout.css" --content-type 'text/css' --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/regional-globe/index.js" "s3://$CUSTOMER_BUCKET/app-static/regional-globe/index.js" --content-type 'text/javascript' --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/regional-globe/globe.css" "s3://$CUSTOMER_BUCKET/app-static/regional-globe/globe.css" --content-type 'text/css' --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/regional-globe/vendor/renderer.js" "s3://$CUSTOMER_BUCKET/app-static/regional-globe/vendor/renderer.js" --content-type 'text/javascript' --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/regional-globe/vendor/types.js" "s3://$CUSTOMER_BUCKET/app-static/regional-globe/vendor/types.js" --content-type 'text/javascript' --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$customer_config" "s3://$CUSTOMER_BUCKET/runtime-config.json" --cache-control 'no-store' --content-type application/json --only-show-errors
for file in styles.css theme.css brand.css theme.js auth.js stage-globe.css favicon.svg; do target="static/$file"; [[ "$file" == favicon.svg ]] && target=favicon.svg; aws_active s3 cp "$ROOT/apps/shared/$file" "s3://$CUSTOMER_BUCKET/$target" --cache-control 'no-cache' --only-show-errors; done
aws_active s3 cp "$PICO_CSS" "s3://$CUSTOMER_BUCKET/static/pico.css" --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$MANROPE_FONT" "s3://$CUSTOMER_BUCKET/static/manrope.woff2" --cache-control 'public,max-age=31536000,immutable' --only-show-errors

aws_active s3 cp "$ROOT/apps/steward/index.html" "s3://$STEWARD_BUCKET/index.html" --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/steward/app.js" "s3://$STEWARD_BUCKET/steward-static/app.js" --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/steward/stage-globe.js" "s3://$STEWARD_BUCKET/stage-globe.js" --content-type 'text/javascript' --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/regional-globe/globe.css" "s3://$STEWARD_BUCKET/app-static/regional-globe/globe.css" --content-type 'text/css' --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/customer/regional-globe/vendor/renderer.js" "s3://$STEWARD_BUCKET/app-static/regional-globe/vendor/renderer.js" --content-type 'text/javascript' --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$ROOT/apps/steward/components.css" "s3://$STEWARD_BUCKET/steward-static/components.css" --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$steward_config" "s3://$STEWARD_BUCKET/runtime-config.json" --cache-control 'no-store' --content-type application/json --only-show-errors
for file in styles.css theme.css brand.css theme.js auth.js stage-globe.css favicon.svg; do target="static/$file"; [[ "$file" == favicon.svg ]] && target=favicon.svg; aws_active s3 cp "$ROOT/apps/shared/$file" "s3://$STEWARD_BUCKET/$target" --cache-control 'no-cache' --only-show-errors; done
aws_active s3 cp "$PICO_CSS" "s3://$STEWARD_BUCKET/static/pico.css" --cache-control 'no-cache' --only-show-errors
aws_active s3 cp "$MANROPE_FONT" "s3://$STEWARD_BUCKET/static/manrope.woff2" --cache-control 'public,max-age=31536000,immutable' --only-show-errors

# Shared branding is served on every application's own origin, including signed pages.
for bucket in "$PUBLIC_BUCKET" "$CUSTOMER_BUCKET" "$STEWARD_BUCKET"; do
  aws_active s3 sync "$ROOT/apps/shared/brand" "s3://$bucket/static/brand" --cache-control 'no-cache' --only-show-errors
  aws_active s3 cp "$ROOT/apps/shared/favicon-dark.svg" "s3://$bucket/favicon-dark.svg" --content-type 'image/svg+xml' --cache-control 'no-cache' --only-show-errors
done


distribution_keys=(PublicDistributionId CustomerDistributionId StewardDistributionId)
distribution_ids=()
invalidation_ids=()
for key in "${distribution_keys[@]}"; do
  id="$(output "$key")"
  invalidation_id="$(aws_active cloudfront create-invalidation --distribution-id "$id" --paths '/*' --query Invalidation.Id --output text)"
  distribution_ids+=("$id")
  invalidation_ids+=("$invalidation_id")
  printf 'Invalidation %s submitted for %s.\n' "$invalidation_id" "$key"
done
for index in "${!distribution_keys[@]}"; do
  aws_active cloudfront wait invalidation-completed --distribution-id "${distribution_ids[$index]}" --id "${invalidation_ids[$index]}"
  printf 'Invalidation completed for %s.\n' "${distribution_keys[$index]}"
done
printf 'Static applications deployed to %s (public + customer app), %s (legacy customer redirect), and %s.\n' "$WW_PUBLIC_DOMAIN" "$WW_LEGACY_CUSTOMER_DOMAIN" "$WW_STEWARD_DOMAIN"
