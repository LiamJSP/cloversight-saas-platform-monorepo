# Accessibility and browser QA

The interfaces author semantic headings, landmarks, labels, native buttons/forms, focus rings, textual status cues, responsive tables, image context and reduced-motion styles. These are source foundations; they do not establish WCAG 2.2 AA conformance.

## October 10, 2026 remediation status

The compliance audit reviewed release 0.5.12 passively. The changes below address source findings, without running the application, builds, scans, browser sessions or assistive technology. Preserve the original PDF/Markdown audit as historical evidence; this list records later implementation and remaining verification.

| Finding | Source change | Remaining work |
| --- | --- | --- |
| W01 light soft-copy contrast | `apps/shared/theme.css` darkens the light `--ww-copy-soft` token to `#68657c`. | Measure rendered text and controls against their actual backgrounds, including gradients and both themes. This change is not a palette-wide pass. |
| W02 recipient suggestions | Recipient suggestions use an ordinary named group of native buttons. The name input has help text; counts/failures/selections are status messages. Suggestions stay open while focus remains inside the widget, support Tab/Shift+Tab and native button activation, and Escape returns to the input. Results are discarded after focus leaves, a changed query or a detached editor. In-flow layout keeps suggestions beside their field on phones. | Verify screen-reader reading order, team linkage, manual recipient entry, slow requests and touch/software keyboard behavior. A custom ARIA combobox pattern is intentionally unnecessary for this simpler native-button interaction. |
| W03 staff idle view expiry | A two-minute advance warning includes an explicit Keep client view open button. It can extend the current thirty-minute idle period repeatedly; once warned, incidental movement does not dismiss it. The warning is inside the active dialog when present and otherwise in the workspace. Expiry still clears sensitive records/editors and presents a persistent explanation. | Verify an unsaved note and support edit at the boundary with keyboard and screen-reader browse mode. Review background-tab behavior and the actual privileged authentication policy separately. This is the existing client-view idle safeguard, not a Cognito session lifetime extension. |
| W04 persistent form errors | Customer profile/report/watcher save and publication failures have persistent focusable summaries. A missing owner watching-region choice has a nearby error associated with every group checkbox. Staff lookup/search, note, support-edit, invitation, threshold and suppression-add form failures retain their summaries. Native validation remains in place. | Review every remaining business action, nested confirmation, financial failure and rejected field for precise correction guidance; some non-form actions still use transient notices. Generic server errors cannot be attributed to a specific field without a reliable server error contract. |
| W05 report polling | Polling updates only the matching report row status/file cells. It keeps the request form and other rows stable, tracks meaningful terminal transitions, and announces completion once. Submitting another report preserves its scope/period choices and active form. A background completed watcher check also updates report rows without replacing this form. | Verify focus and choices across several concurrent reports, completion/failure and navigation. Other passive full-refresh paths remain a review item. |
| W06 status information | Archive result counts/no-match summaries have a polite status region. Screenshot preparation/failure nodes have status/alert semantics. Failed overlays show an explicit persistent explanation associated with the overlay checkbox and reset when Reload evidence is chosen. | Verify real announcements and avoid redundant updates. Preview grids are not blanket live regions; disabled overlays have adjacent visible explanations. |
| W07 own-profile input purpose | Country and region selectors, including dynamically recreated region selectors, use `country` and `address-level1` autocomplete purposes. | Verify autofill and assistive-technology behavior in both select and free-text branches. Staff/third-party lookup fields do not acquire own-user autocomplete meanings. |
| W08 visual result alternatives | Existing text differences, regional outcomes, dimensions, percentages and legends are preserved. | Deferred: define and implement an equivalent description of meaningful spatial/graphic-only changes. A detector percentage or device/region alt label cannot establish equivalence for every result-review task. |
| W09 report document structure | Reports expose a Read HTML report action alongside the PDF when an HTML artifact is available. The backend generates HTML from the same report model; legacy jobs may have only PDF. | Inspect exact report scope/period, Unicode, headings, tables, reading order and complete bounded report content. Existing PDFs remain untagged; no PDF/UA or accessible-PDF claim is made. |
| W10 navigation and focus return | Customer rendered routes update the document title. Deliberate route/archive navigation focuses the page heading. Modal opener matching includes snapshot identity. Staff support close awaits the replacement view and finds the corresponding logical action before restoring focus. | Verify complete modal open/close/return flows, mobile menu collapse, sticky headers, zoom, software keyboard and nested confirmations. Passive report polling does not focus the heading. |

Related privacy changes: local customer recovery drafts have a seven-day access-time expiry, scoped sign-out/closure clearing, and a write fence during that cleanup. This cannot erase browser storage on another origin, browser or device, and expiry is not a background browser-storage sweeper. My profile offers an authenticated JSON download limited to the current person's profile and membership; other privacy requests remain a support process.

Before production, run automated WCAG 2.2 AA scans and manual keyboard/screen-reader tests for:

- Navigation and modal focus containment/return
- Watcher editor validation and error announcements
- Offline/recovery status announcements
- Alert response form
- Steward timeout warning/jettison
- Transaction and refund actions
- 200% zoom and narrow mobile layouts

Browser targets should include current Chrome/Chromium, Firefox, Safari, and Edge. IndexedDB availability, cleanup failures and multi-tab recovery need cross-browser verification; publication can use its existing fallback when `navigator.locks` is unavailable.

## Owner-run evidence checklist

Use staging and test identities/content. Record build/date, role, route/state, browser/AT versions, exact steps, observed outcome, correction and recheck result. No checklist item below has been claimed passing.

1. Type a recipient name, wait for suggestions, Tab into a suggestion and pause beyond 160 ms. Use Enter and Space, Shift+Tab and Escape. Check that the selected registered user/email and watching-region preferences remain linked; edit name/destination afterward and check unlinking. Repeat while typing quickly and while a slow request finishes after closing the editor.
2. Reject an owner profile without a watching region and reject staff support edits/server saves. Read the summary after more than ten seconds, follow the field context, correct the data and submit again. Confirm a page or modal footer does not hide the focused error at 320 CSS px or with a software keyboard.
3. Start a report and prepare a second report with different choices. Over several polls, confirm unchanged focus and form values; observe completed/failed reports and one meaningful announcement. Open both the same-scope HTML and PDF, including names with non-ASCII characters. Older reports without HTML need regeneration for the HTML alternative.
4. Search archives to zero and nonzero results. Interrupt screenshot/overlay loading, then reload. Check visible persistent explanations and announcements without making the whole evidence grid live.
5. Open different snapshots for the same watcher, close each result and confirm return to the exact card. Open/close support edits and nested confirmations. Check titles and heading focus on deliberate navigation while background report polling continues.
6. Keep an unsaved staff note/support edit at the idle boundary. In screen-reader browse mode, hear the two-minute warning, reach Keep client view open and extend at least twice. Allow expiry and verify sensitive state clears with an accessible persistent explanation. Background-tab expiry remains a security boundary to evaluate explicitly.
7. Check both themes, 200% text enlargement, 400% zoom from 1280 px, 320 CSS px, portrait/landscape, text-spacing overrides and reduced motion. Text-spacing inputs: line height 1.5, paragraph spacing 2em, letter spacing 0.12em, word spacing 0.16em. Measure actual target sizes/spacing and focused-content obstruction.
8. Review complete hosted Cognito sign-in/MFA/recovery and Stripe checkout with paste/autofill and required accessible-authentication behavior. First-party source changes cannot validate those external steps.
9. Include Orca/Firefox on Linux and representative NVDA/Chrome and iOS VoiceOver checks where devices/reviewers are available. Verify visual-only incident meaning, report semantics, response pages and alert emails with images off/enlarged text.

The target remains all applicable A/AA criteria and complete processes, including required external steps. Scan results and authored controls alone do not constitute an ACR/VPAT or conformance certification.
