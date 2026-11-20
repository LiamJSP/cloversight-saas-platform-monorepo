# Privacy engineering and operating decisions

This document records implemented source behavior and the decisions still needed after the October 10, 2026 audit. It is not a finalized privacy notice, customer DPA, legal retention policy, GDPR applicability determination or statement of compliance. The public notice needs owner-approved facts before purpose-specific legal bases, transfer commitments and contact designations can be finalized.

## Changes implemented in this source session

- Customer account closure records operational, customer identity and configured-asset stages independently from notification acceptance. Known bound Stripe subscriptions block purge until a terminal canceled/incomplete-expired state is recorded; unresolved internal payments/refunds also retain their original recovery records for reconciliation. The source does not choose or perform provider cancellation. Operational erasure advances in bounded resumable batches with separate restricted finance/identity rows. Directory deletion checks an immutable Cognito subject; unresolved bindings retry with a bound or require manual review. Shared memberships retain their required profile/identity, and completed erasure entries discard temporary email/sub/username lookup fields.
- Closed-subject replay cannot silently create a replacement tenant from the same bearer identity. A fresh verified directory subject may register; the tombstone lifetime and any reinstatement policy remain open decisions.
- Account-linked unsubscribe records are removed with operational data; expiry maintenance removes stored links after their validity. Global opt-out suppressions remain effective so erasure does not re-enable unwanted mail.
- The profile download returns only the requesting authenticated subject's current profile and membership, with explicit fields. It does not disclose tenant-wide captures, other members, staff notes or an unfiltered audit dump, and it does not promise a complete access response or Article 20 portability scope.
- Inbound MIME reads are size-bounded and permanent parse/reply errors are rejected without repeated application processing. Raw receipt objects still have the existing seven-day asynchronous S3 lifecycle; parsing is not sensitive-data detection.
- Deletion-notice attempts are durably claimed before sending, with attempt-fenced outcomes. Stale or suppressed/ambiguous sends require review; acceptance is never labeled proof of receipt.
- Browser watcher drafts expire after seven days when accessed and the current account/viewer draft is removed on signout and scheduled closure. Other browser/profile devices and abandoned storage still need the approved technology inventory and lifecycle policy.

See [data lifecycle](data-lifecycle.md) for exact technical scopes and limits. A closure request is not a complete substitute for an individual-rights case, a processor return/deletion instruction, or a provider/backup deletion outcome.

## Owner facts and decisions needed

| Audit IDs | Required fact or decision | Work remaining |
|---|---|---|
| G01, G02 | Legal entity, territorial applicability and processing-specific controller/processor roles | Approve notice matrix and executed customer/vendor DPA schedules; do not infer consent from accepting subscription terms. |
| G01, G06 | Exact recipients, provider entities, Regions and support/administrative remote access | Approve applicable transfer mechanisms and any supplementary assessment; regional capture choice alone is not a residency guarantee. |
| G03 | Responsible privacy owner/backup and verified request intake/routing | Maintain durable cases, proportionate identity checks, calendar deadlines, justified extensions, searches/redaction and secure responses. The limited profile export is only one source. |
| G04, G05 | Fresh registration/reinstatement policy, shared-identity dependencies, subscription cancellation and legacy directory bindings | Approve minimal fence lifetime and immediate/period-end provider cancellation/credit policy; review existing closed records and identities created by unaccepted invitations; establish independently verifiable vendor outcomes. |
| G05, G07 | Current and retired resource inventory, backup/log/audit schedules, restore rules and holds | Build historical location registry, privacy-generation/replay fence and restore-before-serving suppression; validate the new bounded resumable purge and approve each retained exception. |
| G07 | Finance/support/audit/security/suppression categories and purposes | Specify minimum fields, lifetime starting event, hold/release authority, disposal and backlog monitoring. Scale indefinite plan storage is not a blanket basis for indefinite personal-data retention. |
| G08 | Accepted sensitive/children/employee-monitoring uses and processing instructions | Define minimization defaults and screen use cases for applicable risk/DPIA conditions; technical URL access is not a lawful basis. |
| G09 | Incident owner/backup, awareness rules and contact roster | Create/exercise a privacy incident register and provider/customer/authority communication plan; site outages and personal-data breaches require different assessments. |
| PCI-01, PCI-02 | Actual merchant payment channels, accepted validation scope and unexpected card-data handling | Obtain provider/acquirer/ASV evidence and safe discovery/quarantine/scoping/deletion procedures; do not put credentials/card data into targets, notes, captures or support email. |

## Individual-rights operating workflow to establish

1. Record the request, receipt date, requesting person, intended scope, accountable owner and whether CLOVERSIGHT is the controller or assisting a customer-controller. A team member, alert recipient or captured third party must not be required to close the company's account.
2. Verify identity proportionately, document the need for additional evidence and route customer-directed capture requests to the correct controller when CLOVERSIGHT acts solely as processor. Do not disclose an entire tenant just because a requester appears in one capture.
3. Apply the relevant calendar-month response rule and any justified extension using an actual case deadline, rather than the configurable account-closure grace. Record the reasons and required communications. These deadlines need a case tool/register; this release does not implement one.
4. Search all relevant sources: profile/team/invitations, recipient/reply/suppression/link data, billing/support/notes, captured content/report objects, security records, provider copies, retired locations and applicable backups. Record scope, search result, exception and any third-party redaction.
5. Decide access, correction, deletion, restriction, objection or applicable portability scope using the actual processing purpose and role. The limited self-service JSON is a current-profile convenience; inferred data, other members' data and screenshots require separate scope decisions.
6. Deliver through a verified secure channel, retain response/exception evidence and close the case separately from provider acceptance of a notification. Set owners and deadlines for unresolved provider/resource stages.

## Privacy incident operating workflow to establish

Record awareness timestamps, facts/evidence, affected purposes/data/people and immediate containment. Assign the incident owner and backup; record risk assessment, controller/processor role and notification decisions. Where applicable, processor notification without undue delay, controller supervisory notification generally within 72 hours of awareness, and high-risk individual communication are separate decisions. Preserve necessary forensic records under a documented hold and exercise the actual contact/fallback paths. Technical/security alert acceptance does not by itself complete these obligations.

## Primary references reviewed for engineering decisions

- [AWS AdminGetUser](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminGetUser.html), [ListUsers](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListUsers.html), and [AdminDeleteUser](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminDeleteUser.html): application IDs are hashed subjects, not raw Cognito usernames; filtered searches require a verified subject binding.
- [Stripe Checkout Session](https://docs.stripe.com/api/checkout/sessions/object) and [hosted invoice pages](https://docs.stripe.com/invoicing/hosted-invoice-page): navigation uses provider-owned URLs; custom Checkout domains need exact reviewed origin configuration.
- [Official EU GDPR text](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679) and the primary sources listed in the supplied compliance audit: legal applicability, bases, contracts, rights, retention and transfer decisions remain processing-specific.
- [EDPB individual-rights guidance](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en) and [EDPB breach-notification guidance](https://www.edpb.europa.eu/system/files/documents/2023-04/edpb_guidelines_202209_personal_data_breach_notification_v2.0_en.pdf): the rights/case and incident workflow above is an operating worklist, not evidence that those processes are already implemented or exercised.
