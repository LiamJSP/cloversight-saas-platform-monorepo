# ChatGPT staging browser access

This 0.5.9 hotfix restores the owner-requested any-IP staging exception. It is source work prepared on 2026-10-07 (America/Halifax); it has not been deployed to AWS.

## Why access stopped

The supplied 0.5.9 source contains only `AllowDeclaredAddresses` in both `EdgeWebAcl` and `RegionalWebAcl`. The original [0.5.9 release notes](release-notes-0.5.9.md) explicitly record removal of the previous signature-shaped browser-header exception. There is no surviving user-agent check whose version simply needs changing.

During this investigation, both `https://staging.cloversight.app/` and `https://staging.cloversight.app/app/?action=login` returned a CloudFront 403 page saying “Request blocked” in the cloud browser. The login entry point was blocked before a Cognito redirect could be reached. This is consistent with the source policy; AWS account access and WAF request logs were unavailable, so the actual deployed rule configuration and the failing rule have not been confirmed.

## Identification and matching

[OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots) lists `ChatGPT-User/1.0` for some user-initiated page requests. The interactive browser agent is a separate path: [Cloudflare's ChatGPT agent registry](https://radar.cloudflare.com/bots/directory/chatgpt-agent) lists an HTTP message-signatures key directory and does not publish a distinct user agent. [Cloudflare's Web Bot Auth documentation](https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/) describes the three signature headers and the `web-bot-auth` tag. Do not assume a plain Chrome version identifies ChatGPT.

Both staging ACLs now have identical rules:

| Priority | Rule | Match | IP requirement |
| --- | --- | --- | --- |
| 0 | `AllowDeclaredAddresses` | Existing configured IPv4/IPv6 IP sets | Declared CIDR |
| 1 | `AllowChatGptUserAgent` | A bounded, case-insensitive `ChatGPT-User/<digit>`, `ChatGPT-Agent/<digit>`, or `ChatGPT/<digit>` product token in `User-Agent` | Any |
| 2 | `AllowChatGptBrowserHeaders` | All three header conditions below | Any |
| Default | Block | No allow rule matched | Block |

The user-agent rule does not pin a product or Chrome version. The documented `ChatGPT-User` form is supported; the other ChatGPT product forms provide compatibility without assuming this session sent them.

The browser-header rule requires:

1. `Signature-Agent` is a double-quoted HTTPS ChatGPT origin (with an optional trailing slash), or its exact `/.well-known/http-message-signatures-directory` URL (also allowing a trailing slash).
2. `Signature-Input` contains the `tag="web-bot-auth"` signature parameter.
3. `Signature` contains a named, colon-delimited base64-shaped signature value. No particular signature label, signing key ID, or Chrome release is pinned.

This supports the published browser signing identity and common origin-form headers. The exact outgoing request headers of the browser session used here could not be inspected. Headerless browsers, a changed signing identity, or an intermediary removing these headers will still be blocked unless their IP is declared. Do not resolve such a failure by allowing generic Chrome, all user agents, or all IPs.

These rules match strings; they do not fetch the key directory, verify a signature, validate expiry, or prevent replay. Both the user agent and the signature-header pattern are spoofable. This deliberately implements the requested staging compatibility exception and must not be treated as proof that the caller is OpenAI. Cognito login, customer/steward issuer separation, tenant ownership, route permissions, and origin verification still apply.

## Configuration

Set `STAGING_CHATGPT_BROWSER_ENABLED=true` in the existing private `.env`. An omitted value also defaults to true for staging. The deployment settings export `WW_STAGING_CHATGPT_BROWSER_ENABLED`, and the primary deploy passes it as the CloudFormation parameter `EnableStagingChatGptBrowser`.

The parameter is combined with `IsStaging` in `EnableStagingChatGptAccess`. Both optional rules are removed when false. Beta and production do not attach these staging ACLs.

## Apply the hotfix

Extract the updated ZIP into a new folder. Copy your existing private `.env` and private `.local/staging-ip-allowlist.txt` into it; keep `.env` mode 0600. Preserve the deployed `BASE_DOMAIN=cloversight.app`, `STAGE=staging`, stack name, AWS account, Cognito settings, and other deployment values. Do not replace those with example defaults.

Use the normal deployment path from the repository root:

```bash
aws sso login --profile saas-admin
npm ci
npm run aws:build-worker
bash infra/scripts/merge-generated-env.sh .local/worker-image.env
npm run aws:deploy
npm run aws:deploy-regional
```

Each line is a separate command. The worker build is required by this repository's existing source-hash contract: both `src/deployment/settings.mjs` and `infra/scripts/deploy.sh` participate in that hash. Do not bypass the contract or copy a stale image marker. The primary deployment installs both WAF rule sets; the regional deploy keeps the rebuilt image aligned in configured capture Regions. No frontend content changed, so `aws:deploy-web` is not needed for this hotfix. `aws:update-allowlist` changes IP sets only and cannot install the browser exception.

To return to IP-only staging access, set `STAGING_CHATGPT_BROWSER_ENABLED=false` and deploy the primary stack again. Changing `.env` alone does not update AWS.

## Inspect after deployment

Wait for the primary stack to complete and for WAF changes to propagate, then open the homepage and login entry point in a fresh ChatGPT browser session. Confirm the Cognito managed login loads and the callback returns to `/app/`. A successful homepage fetch alone does not prove that Cognito's regional WAF allows the session.

In the AWS WAF console, inspect both the CloudFront-scoped and regional ACLs:

1. Verify `AllowChatGptUserAgent` and `AllowChatGptBrowserHeaders` are present and the default action is still Block.
2. Look for a matching request under the respective rule's sampled requests and CloudWatch metric. The distinct rule names identify which path admitted the request.
3. If access is still denied, capture the blocked request's source IP and the `User-Agent`, `Signature-Agent`, `Signature-Input`, and `Signature` header presence/pattern from WAF telemetry. Redact cookies, tokens, and unrelated headers before sharing logs. Sampling may omit an individual request; use existing WAF logging if available.
4. If the browser has none of these identifiers, the any-IP header rule cannot distinguish it from an ordinary browser. Use a trusted source-IP entry or provide the observed identifying headers for a targeted follow-up.

## Review boundary

The original archived 0.5.9 release notes describe the pre-hotfix policy and remain intact. Current architecture, security, deployment, operations, README, and IaC validator descriptions have been updated.

No application tests, builds, AWS deployments, or Cognito sign-in were run for this source update. Only read-only inspection of the two blocked staging entry points was attempted. Successful access after the new WAF rules are deployed remains unverified.
