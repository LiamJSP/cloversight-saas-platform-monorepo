# Test review — 0.5.14

This is a passive source/coverage review, **not a passing test report**. There are 38 root service/contract test files, two local browser files and one staging browser file. Explicit staging smoke/functional/regional/payment/token/CI/load scripts are separate entry points. No tests or application/simulator/browser binaries were executed.

## Useful gates and their limits

| Layer | Keep because | Limits / action |
| --- | --- | --- |
| Root `node:test` service/API tests | Tenant denial, provider bindings/replay, refunds/renewals, credit quotas, notification budgets, SSRF/proxy limits, tokens and account lifecycle protect concrete expensive/security failures | File/in-memory stores and fixture network responses cannot prove DynamoDB/IAM/distributed ordering or actual Stripe/SES results. |
| Deployment/IaC source contracts | Guard previously observed route ordering, GSI upgrade steps, origin header policy, Cognito OFF-MFA behavior and immutable worker contracts | Narrow source expectations are contracts, not runtime proof. Retain these targeted regressions; do not add general file-exists/keyword-count tests. |
| Local real Chromium | Capture/exclusion/viewport behavior, safe Check Status output, modal focus and steward history | Separate from `npm test`; missing Chromium must fail. Docker pins the same Playwright version and uses no external network for local mode. |
| Staging functional/browser | Explicit host/identity/account bindings and bounded read-only customer journeys | Existing-token rendering does not certify actual Cognito login/MFA. Browser interception allows only same-host GETs and counts the initial bootstrap within its 20-request ceiling. |
| Staging regional/payment probes | Bounded actual regional work plus payment-boundary denial when explicitly requested | Regional checks create work only behind opt-in flags; absence of fixtures/warnings must not be represented as successful coverage. |
| Load probe | Bounded read path under stated request/time/concurrency ceilings | Estimated per-attempt cost is not an AWS bill cap or capture-throughput benchmark. Keep opt-in; do not run during a routine deploy. |
| Dependency CI | Audit root and deployed subpackages separately, record SBOMs | Runtime locks are absent; CI is deliberately blocked until reviewed locks exist. Registry audit alone does not scan container OS packages. |

## Repairs and meaningful new regressions

- Report test expected one write after the 0.5.13 HTML companion added a second. It now validates PDF and HTML content types/private cache policy, matching scoped keys, completed status, escaped Unicode customer names, and absence of another tenant's markers from both formats.
- Report completion-commit failure must reject and durably fail the job, covering the `return await` completion fence instead of a source-code substring check.
- Closure tests now cover active bound Stripe subscription/unsettled-payment safety holds, preservation of original recovery references, resumable >80-record operational cleanup, irreversibility after purge begins and the identity-before-assets confirmation gate. They do not fake a complete provider-erasure certification.
- Real local browser regressions now scroll the actual public page/menu and assert navbar/close geometry and computed 1rem adjacent spacing in a short portrait viewport. A customer phone test similarly scrolls its menu and checks the viewport-attached close control. These assert user behavior instead of mirroring CSS text.
- The new workflow shell joins existing AWS shells in `iac:validate` syntax and executable-mode checks.
- Removed redundant CI `browser:docker:check` calls: the actual Docker runner already calls the same readiness guard. The standalone doctor command remains available for diagnosis.
- Native browser installation now invokes the checked-in locked Playwright CLI rather than asking npx to resolve/install another package. Startup root installation uses a package/lock fingerprint to avoid unconditional reinstall loops.

No regression files were deleted merely to lower runtime. The predecessor September review already removed two source-grep tests that could not establish AWS health or login behavior. Historical review conclusions are superseded by the current guides and actual CI source.

## Avoid repeated work

After `npm run setup`, use `npm test` while editing service behavior, or `npm run test:release` for the complete local release gate. `verify` already includes `npm test`; `test:release` includes `verify` and the Docker browser suite. Do not run all three in succession on an unchanged tree. `package:release` intentionally re-verifies the exact archived tree but does not rerun Chromium. Documentation rendering and live staging gates are independent.

CI keeps deterministic tests, browser tests, dependency audits and documentation in separate jobs. The staging job is manual, branch/environment bound and serialized; no automatic deployment or provider load is introduced. The Playwright package/container/driver pair remains pinned and unchanged.

## Coverage still required before promotion

1. Real DynamoDB conditional account activation/revision checks and a closure race with an in-flight capture/report/baseline write; IAM allow/deny evidence against deployed roles.
2. SES accepted/failed/ambiguous outcomes and maintenance lease/cache-rotation races need focused injected-failure regressions beyond existing notification/Twilio fixtures.
3. Actual customer/steward Cognito login, token renewal, production TOTP enrollment/recovery, staff idle warning and owner-only global suppression actions.
4. Real Stripe test-mode webhook replay/renewal/refund reconciliation and the owner-decided subscription cancellation policy.
5. Queue partial-region replay/admission/starvation and delayed result delivery under controlled staging failure injection.
6. Full keyboard/assistive-device/reflow/contrast acceptance, including steward portrait navigation and email/report rendering.

These remain explicit follow-up/owner gates. A green source suite alone is not release certification. See [readiness](release-readiness-0.5.14.md) and the [complete October 10 register](audit-change-register-2026-10-10.md).
