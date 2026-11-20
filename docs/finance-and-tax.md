# Finance and tax operating design

This document is an implementation checklist, not legal or accounting advice. Rates, thresholds, registration duties, vendor features, and bank procedures require current verification before launch.

## Accounts receivable ledger

Record these separately for every transaction:

- Customer and internal transaction ID
- Provider, provider customer, invoice, payment, refund, dispute, and payout IDs
- Subscription period
- Gross service amount before tax
- Proration credit or discount
- Tax by jurisdiction
- Provider fee
- Refund and refunded tax
- Chargeback/dispute amount and fee
- Settlement currency
- Provider exchange rate and foreign-exchange difference
- Net provider payout
- RBC deposit ID/date
- Reconciliation status

Do not record the net Stripe/PayPal deposit as revenue. Revenue, tax liability, provider fees, refunds, and FX differences are different accounts.

## Suggested chart-of-accounts categories

- Subscription revenue — USD (current 0.5.0 price book)
- Subscription revenue — CAD (legacy settlements only)
- Deferred subscription revenue, when applicable
- GST/HST payable
- Provincial sales tax payable by jurisdiction
- US state/local sales tax payable by jurisdiction
- Stripe clearing
- PayPal clearing
- Paddle merchant-of-record clearing
- Payment processing fees
- Refunds and credits
- Chargeback expense
- Foreign exchange gain/loss
- RBC operating cash

## Monthly close workflow

1. Freeze the period and export the internal transaction ledger.
2. Export provider balance transactions, invoices, refunds, disputes, and payouts.
3. Reconcile every internal completed/failed/refunded transaction to provider records.
4. Reconcile provider payouts to RBC deposits.
5. Investigate unmatched or duplicated entries before posting revenue.
6. Reconcile tax collected by jurisdiction to tax-liability accounts.
7. Reconcile deferred revenue and credits.
8. Retain evidence and lock the period.

## Canada

The implementation should collect a reliable customer country, province/territory, postal code, business name, and tax IDs/exemption evidence where applicable. Use Stripe Tax or another maintained tax engine only after the corporation’s registrations and product tax code are configured. The business must determine GST/HST and any separate provincial obligations with a Canadian accountant.

## United States

Track economic-nexus metrics by state even before registration. Do not start collecting a state’s tax simply because a static rate table says so; determine whether registration, marketplace-facilitator treatment, product taxability, sourcing, exemptions, and local components apply. Use provider reports as calculation evidence but retain an internal jurisdiction ledger.

## Stripe, PayPal, and Paddle differences

Stripe and standard PayPal processing generally leave the corporation as seller of record. Paddle’s merchant-of-record model can make Paddle the seller/remitter for covered transactions. Preserve provider-specific legal seller, invoice issuer, tax remitter, and payout accounting. Do not blend them into one generic “payment” record.

## RBC workflow

Use a dedicated corporate operating account. Prefer separate CAD and USD receiving/holding arrangements when supported and economical, so forced conversion is not mixed into subscription revenue. Import or capture deposit IDs and match each to provider payout IDs. Restrict bank access, require MFA, and use dual review for changes to payout destinations.

## Required current confirmation

Before treating this checklist as an operating policy, confirm the corporation's current registrations and tax accounts with a Canadian accountant, then verify each payment provider's current seller-of-record and tax responsibilities and the bank's current USD/CAD account and payout terms. Record the decisions and supporting documents in the company's controlled finance records.

## Restricted retention decision still required

Account closure currently keeps identifiable legal name, contact email, country/region, tax IDs, masked provider references and a redacted transaction summary in the restricted closed-account store. Masking does not make that ledger anonymous. The implementation has no finalized category-specific expiry or legal-hold release workflow; no automatic number of years has been assumed.

Approve, with the relevant finance/privacy owner, the minimum fields needed for invoice/tax/reconciliation/dispute purposes, the applicable jurisdiction and starting event for each lifetime, access authority, a narrowly scoped audited hold and hold-release procedure, and disposal of underlying provider references/copies. Preserve a useful reconciliation binding only when justified; irreversible masking is not a substitute for either accounting completeness or minimization. Retained transaction summaries are now partitioned into individual restricted `closed_financial_transaction` rows during bounded erasure rather than accumulating in one DynamoDB account item. The header's erasure manifest distinguishes retained finance exceptions from erased monitoring data; existing inline legacy summaries remain readable. Final expiry, legally justified field selection and finance completeness still need approval.
