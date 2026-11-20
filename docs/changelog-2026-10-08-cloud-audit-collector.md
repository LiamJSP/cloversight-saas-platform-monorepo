# 2026-10-08 — AWS evidence collector

- Added `infra/scripts/collect-cloud-audit.sh`, a standalone read-only AWS CLI/Python collector with source-profile selection, configured/deployed region discovery, primary/regional/bootstrap resource inventory, CloudWatch logs and metrics, configuration, alarm history and matching CloudTrail management-event history.
- Added best-effort secret redaction, private output modes, explicit collection gaps, optional bounded S3 text-log export, compressed complete log streams, heuristic incident excerpts, manifest and checksums. Evidence is retained and packaged after an ordinary interruption or individual permission failure.
- Added the `aws:collect-audit` npm convenience command and an operational guide. No npm dependency installation is required when invoking Bash directly.
- Application/IaC runtime remains version 0.5.10. This tooling-only source snapshot needs no cloud deployment. Previous UI, result, notification and capture-isolation changes remain merged.
- No tests, builds, application execution, AWS calls or deployment were performed. The new collector itself was not executed; runtime collection is for the owner to run with `saas-admin`.
