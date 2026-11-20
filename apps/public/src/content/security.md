---
title: Security Architecture | CLOVERSIGHT
description: Learn how CLOVERSIGHT protects watcher data, billing integrity, staff access, monitoring targets, and alert responses.
eyebrow: Security architecture
heading: Trust the baseline. Verify the boundaries.
lead: CLOVERSIGHT keeps high-impact decisions on the server, constrains monitored targets, and requires deliberate human responses before an alert becomes a new green baseline.
indexLabel: Control areas
sections:
- label: Monitoring isolation
  href: '#monitoring'
- label: Identity and access
  href: '#access'
- label: Staff privacy
  href: '#privacy'
- label: Data lifecycle
  href: '#data'
- label: Shared responsibility
  href: '#responsibility'
cards:
- icon: '01'
  title: Server-owned billing
  description: Prices use integer minor units, signed calculation envelopes, provider Price reconciliation, customer binding, and stable idempotency keys.
- icon: '02'
  title: Constrained capture
  description: Targets are limited to HTTP(S), DNS and redirects are revalidated, private networks are blocked, and page size and runtime are bounded.
- icon: '03'
  title: Deliberate responses
  description: Opening an alert link does not cast a vote. Web responses require a signed, expiring submission; supported email and SMS replies must match a recipient and active response
    code. Configurable thresholds determine acknowledgement and all-clear state.
---

## Monitoring isolation {#monitoring}

Browser profiles are ephemeral. Ignored DOM targets are removed before text extraction and capture, redirects are checked again before navigation, and capture work runs within configured byte, time, and concurrency limits. Ignored selectors filter captured evidence; they do not prevent the page or its resources from being fetched.

## Identity and access {#access}

Customer and steward identities use separate Amazon Cognito user pools and role claims. Authenticated customer and steward API requests require verified email identities and role-appropriate access tokens. Customer requests derive their account from an active owner or invited-member record instead of accepting a tenant ID from the browser. Team directory search is limited to the current team and rate limited. Administrative sessions use shorter token lifetimes and a configured idle timeout.

## Staff privacy {#privacy}

Stewards receive the customer identity needed for support while watcher URLs, recipients, provider customer references, and payment references are masked. Privileged support changes require a reason and are added to the audit stream.

## Data lifecycle {#data}

Monitoring captures use encrypted AWS storage. Customer-visible history follows the selected plan; storage deletion runs asynchronously and includes cleanup buffers. Current comparison evidence and approved baseline records needed for monitoring continuity can remain after older history expires. Account closure disables monitoring immediately and schedules operational deletion after the configured grace period; unresolved billing, subscription cancellation, and records retained for financial or compliance purposes can delay or limit deletion. Closing the account requests immediate subscription cancellation. Provider confirmation is tracked separately from the closure request, and unresolved outcomes require reconciliation before deletion.

## Shared responsibility {#responsibility}

Customers are responsible for monitoring only authorized pages, selecting appropriate thresholds and recipients, protecting account access, and maintaining independent business-continuity and emergency processes.

> **Report a security concern.** Do not include credentials or private captured content. Send a concise description and safe reproduction details to [support@cloversight.app](mailto:support@cloversight.app?subject=Security%20concern).
