# 2026-10-08 — bounded CloudTrail collection (collector 1.1)

- Replaced unbounded default CloudTrail history scanning with AWS `ReadOnly=false` filtering, at most 5 pages / 250 examined events per region and a shared 60-second history-scanning budget. Primary region is scanned first.
- Broad read-event collection is opt-in through `--cloudtrail-mode all`; it still respects page and time limits. Unbounded history requires explicitly disabling both limits. `--skip-cloudtrail` remains compatible and `--cloudtrail-mode off` is also supported.
- Resource matching uses exact IDs and ARN suffixes from event resources/request/response rather than substring searching the entire event. Failed calls from app roles/current caller remain eligible in the selected mode.
- Added per-region progress, explicit coverage, bounded CLI request timeouts and interruption-safe history summaries. CloudWatch runtime logs retain their existing full-window collection.
- Updated the operating guide and agent notes. Application/IaC remains 0.5.10; no deployment is required for this collector correction.
- No collector execution, AWS calls, tests or builds were performed during authorship. Existing user evidence showed 49,000 examined CloudTrail management events; it did not identify which event types caused the volume.
