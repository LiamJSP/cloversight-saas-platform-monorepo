# Customer portal design system

This document records the visual analysis of the three supplied customer-portal references and maps it to the implementation. It is the maintenance guide for the shared portal language, not a pixel-only snapshot.

## Architecture choice

The customer portal uses the self-hosted conditional build of **Pico.css 2.1.1** as its semantic CSS foundation.

Pico is a good fit for this repository because the portal is a small, dependency-light SPA made from server-served HTML and JavaScript template strings. It improves the native form, table, control, focus, and disabled-state baseline without requiring React, a component runtime, class extraction, or a new asset compiler. A utility system such as Tailwind would add a compile-time class scanner and move component-specific design decisions into long template strings; a larger component framework would require extensive overrides to reach the supplied art direction.

The CSS is deliberately layered:

1. pico.conditional.min.css — maintained semantic baseline, scoped by the pico body class.
2. apps/shared/styles.css — existing public/steward styles and compatibility primitives.
3. apps/shared/theme.css — authoritative customer-portal tokens, typography, controls, status treatments, accessibility, and motion.
4. apps/customer/components.css — portal shell, responsive navigation, metrics, watcher table/actions, billing groups, and page-specific decoration.
5. apps/customer/results-evidence.css — retained result evidence, incident treatments, responsive device previews, and thumbnail feedback.
6. apps/customer/mobile-layout.css — compact watcher editor and archive card ownership on phones, including dark-theme button overrides.

The Manrope variable font is self-hosted from @fontsource-variable/manrope, uses only the Latin subset, and falls back to the system sans-serif stack.

## Global reference analysis

| Area | Reference characteristics | Implemented rule |
| --- | --- | --- |
| Canvas | Warm near-white rather than clinical white; faint rose glow; low-contrast geometric ribbons | Layered gradients on the application stage, with CSS-only orb and ring pseudo-elements |
| Shell | Fixed-width left rail and independent content stage; rail divider remains subtle | 272 px desktop grid, 236 px compact desktop, sticky brand/menu row with collapsible navigation below 900 px |
| Top utility bar | Right-aligned health, account, and sign-out controls; translucent; rounded lower-left transition into content | 92 px glass surface with blur, fine divider, and 45 px lower-left radius |
| Brand | Heavy black wordmark and jewel-like magenta rounded-square mark | 1.55 rem Manrope wordmark and multi-layer gradient mark with highlight and depth |
| Navigation | Single line icons; active row uses pale pink wash, plum text, and narrow magenta rail | Inline accessible SVGs, 58 px targets, animated active indicator, no icon library runtime |
| Type | Very dark ink, compact display headings, muted violet-gray body copy, wide uppercase eyebrow text | Manrope variable, -0.055 em display tracking, 0.24 em eyebrow tracking |
| Color | Plum/magenta identity; emerald actions and healthy states; coral attention; neutral violet-gray copy | Central CLOVERSIGHT custom properties in theme.css |
| Surfaces | Translucent white cards, hairline plum borders, large soft radii, restrained low-opacity shadows | 18–28 px radii, 12–14% borders, backdrop blur, layered shadows |
| Controls | Emerald gradient primary buttons; white/plum secondary buttons; generously rounded but not pill-shaped | Shared themed button primitive with 44 px minimum target |
| Status | Small soft pills with semantic color, not solid warning blocks | Green, pink, amber, and red badge variants |
| Tables | Uppercase tracked headers, generous row height, hairline row dividers, soft tinted header | Reusable table primitive with hover wash and horizontal overflow |
| Decorative language | Partial sphere, orbital bands, corner waves, dotted matrices, short magenta rules | CSS-only pseudo-elements so no decorative image requests or accessibility noise |
| Density | More information than the old MVP but ample separation around groups | 8 px-derived spacing rhythm with 20–30 px section padding |
| Motion | References imply polish rather than spectacle | Short view entry, button sheen, health pulse, menu reveal; all disabled by reduced-motion preference |

## Shared component inventory

### Application rail

- The brand occupies a dedicated 96 px top zone.
- The portal rail includes Overview, Watchers, Archived Results, Reports, Team, Action log, Plans & billing, and My profile; a Developer desk entry appears only in the advanced view. Owner-only entries are hidden for members. They share icon size, label weight, horizontal padding, and active behavior.
- The lower rail uses a cropped orbital ribbon, a gradient orb, and the “Monitor what matters” signature.
- On tablets and phones the rail becomes a compact sticky brand/menu row with collapsible, vertically scrollable navigation.

### Workspace heading

- Every route keeps the Customer portal eyebrow, large route name, and muted explanatory line.
- Optional page actions sit at the top right and use the emerald primary style.
- Always on watch appears as a quiet right-side signature only where enough horizontal room exists.
- The heading area reserves enough height for the decorative top canvas at desktop widths.

### Cards and sections

- Top-level data sections use the portal-section class: 27 px radius, translucent surface, hairline border, and soft depth.
- Section headings use a seven-pixel magenta-to-plum vertical accent.
- Dotted matrices appear in the top-right of data sections and are decorative only.
- Empty states remain inside the section as dashed, low-contrast panels.

### Tables

- Headers are 0.68 rem, uppercase, tracked, and violet-gray.
- Body rows use 0.88 rem text, middle alignment, and subtle hover feedback.
- Tables retain horizontal scrolling on tablets. On phones, each row becomes a single-column record card with visible column labels and wrapping long values.
- Phone records use content height, transparent cells, and one card border; the desktop watcher's fixed row height must never apply to a stacked record. Shared report, team, action-log, billing, and overview records use the same compact spacing.
- Buttons and status pills retain 44 px interaction targets wherever the layout permits.

### Feedback and overlays

- Health has a live green dot with a slow halo pulse.
- Toasts use an ink glass surface and remain high-contrast.
- Modals use an eight-pixel backdrop blur and a 24 px panel radius.
- On phones, the watcher editor keeps only Publish watcher and Save draft in a compact fixed action row. Its explanatory introduction stays available to assistive technology, and its decorative desktop progress bar is hidden to preserve editing space. The offline notice and local recovery disclosure live in the scrollable form body; API reconnection updates the publish controls without resetting the form.
- Focus rings use the same translucent magenta token throughout.
- Modal header text wraps within its panel, Close uses intrinsic width, and confirmation details scroll separately from the action row. Editor subsection headings use content height rather than page-heading geometry.
- Native select pickers own Escape while focused. Screenshot tabs associate with their panels and support Left/Right/Home/End navigation; inactive tabs leave the modal's Tab sequence.

## /app/ — overview

### Summary metrics

- Four equal cards at desktop; two columns at mid-width; one column on mobile.
- Each metric combines a circular semantic icon, 2.25 rem count, and muted label.
- Animated count spans inherit their parent number style instead of matching the label rule. The uptime number stays on one line inside the ring, including a three-decimal percentage.
- Identity colors are: active watchers/pink, green checks/green, attention/coral, slots/plum.
- Two cropped rotated corner forms give each card the reference’s wave detail without an image.

### Attention queue

- Uses the standard accented section title and dotted ornament.
- Columns remain Watcher, Type, Issue, Observed, and Status.
- Operational failures and content alerts retain their existing data and ordering.
- The existing zero-state copy is preserved.

### Recent checks

- Uses the same section family as the attention queue.
- Watcher names gain stronger emphasis; outcome badges remain semantic.
- View-results buttons retain their existing enable/disable logic and API behavior.

## /app/watchers/ — watchers

### Page structure

- The count and minimum interval remain directly below the title.
- The create action uses a circled-plus icon and the shared emerald treatment.
- The table is wrapped in one large translucent section, matching the reference.

### Watcher row

- Enabled? is surfaced first as a green Yes or neutral No pill.
- Name and URL share a cell; the URL is violet-gray, single-line, and exposes the full value with a native title.
- Methods are compact neutral pills with wrapping.
- Schedule shows the human interval first and next-check time second.
- Last result shows the semantic outcome first and observed time second.
- The underlying watcher status still controls whether check-now and pause/resume actions are available.

### Actions

- The resting state is a native Actions disclosure.
- Hover, keyboard focus, or opening the disclosure reveals the available action panel on desktop.
- Actions are Edit, Check now, Enable/Disable, View results, Check status, and owner-only Delete.
- Icons are static inline SVG; text remains present for comprehension.
- On narrow phones the disclosure opens compact action rows within its watcher card. It has no fixed height limit, so every available action remains reachable.

### Check Status

- The status panel keeps its title and Close control in a fixed header region.
- Its body uses the same 28 px desktop and 16 px phone horizontal padding as the watcher editor.
- Regional status and notification activity share a vertically scrollable body with a stable scrollbar gutter.
- Regional status details and recipient summaries stack on phones, and long destination addresses wrap.

## /app/billing/ — billing and plan

### Plan chooser

- The chooser is one large section with a compact explanatory heading and right-side reliability mantra.
- Plans are grouped as Starting plans (Free, Essentials), Operations teams (Professional, Team), and High-volume monitoring (Business, Scale).
- Each group has a label, concise group purpose, and two plan cards.
- Plan cards retain the server-provided name, amount, summary, watcher limit, interval, detection capability, and action.
- The active plan uses a magenta outline and top-attached Your plan ribbon.
- Business has a Popular tag; Scale has a Highest tag and a restrained violet glow. Scale routes to sales rather than self-serve checkout.
- Current-plan buttons remain disabled and use a muted green state.
- Groups stack vertically below 1080 px; their internal pairs stack on phones.

### Transactions

- The section uses a strong heading and compact client-side search field.
- Search filters only already-authorized bootstrap rows and makes no additional request.
- Columns align to the reference intent: Date, Description, Amount, Status, and Action.
- The transaction ID is secondary under the human plan name.
- Empty and no-match states are explicit.

## /app/profile/ — My profile

- Personal and account fields always use one input per row, including desktop layouts.
- Watching regions are a labeled fieldset with one checkbox row per region and shared explanatory text.
- Personal details, team account information, account closure, and the local developer identity card share a 760 px maximum-width stack.
- Saving has its own separated action row, while account closure uses a distinct danger-bordered card below the profile.

## Responsive and accessibility contract

- Desktop shell: persistent vertical rail and glass utility bar.
- Compact desktop: narrower rail and reduced metric/card padding.
- Tablet: rail becomes a sticky brand/menu row with collapsible navigation.
- Phone: one-column plans and profile fields, full-width heading actions, and labeled table record cards. Summary metrics use two columns where space permits and one column below 390 px.
- Phone domain uptime cards fit the available width; operational summary chrome scrolls with the page while the compact brand/menu row remains sticky.
- The phone navigation button occupies the right edge of the brand row; its automatic margin explicitly overrides the shared button margin reset.
- Dark navigation and destructive controls own their neutral/red surfaces above the shared primary-button cascade. Compact desktop topbars wrap identity and outage values in two rows.
- Selecting another route or returning from an archive starts at the page heading. Evidence navigation measures the sticky results header instead of assuming a fixed height.
- Phone modal headers keep Close next to the title, with forms and status bodies scrolling within the viewport.
- All interactive SVGs are decorative because their adjacent text is the accessible name.
- The health region remains live through the existing status node; the toast now explicitly uses a polite live region.
- Native details/summary semantics provide keyboard access to watcher actions.
- Color is never the only status cue; every state retains visible text.
- The complete motion layer honors prefers-reduced-motion.

## Retained results and archived evidence

- The shared View Results dialog leads with the incident classification: complete or regional website outage, trigger phrase, content change, or no detected alert. Missing regional captures leave outage scope unconfirmed rather than implying a complete outage.
- One check, three views prominently presents Desktop, Tablet, and Mobile previews for the selected retained region. A visual difference, a confirmed match, an unavailable comparison, and a missing capture have distinct labels. Selecting a device opens its existing full evidence panel.
- The coverage list shows the regions actually retained for that check. Editing a watcher's configured regions does not rewrite an archived check's region list. Each available comparison names its own earlier regional capture; absent comparison evidence never means unchanged.
- Text excerpts and headline text/visual percentages identify their primary evidence region. The globe and coverage list show the other regional outcomes independently.
- A nonzero percentage alone is a measured variation, not an alert. The globe uses the retained regional detector reasons to label a change; below-threshold variation stays within thresholds. Historical checks do not borrow the watcher's current thresholds.
- Archive stacks use bounded review previews when available, with loading/failure feedback and a Reload thumbnails action. Evidence loading coalesces requests per image, has a deadline and bounded retries, and cancels detached views. Retries refresh the account-authorized signed URL without changing its query string.
- Archive stacks have their own transparent button surface in both themes. On phones their preview cards fill the available container width, capture time and incident badges occupy separate lines, and retained result cards use compact spacing with wrapping measured values.
- Refresh responses must match the active account, watcher, and snapshot. Device lookup is exact, and no regional or profile fallback may relabel another capture as the requested evidence.
- A deleted watcher can still have results within its authorized history window. The read-only archive dialog uses the retained snapshot context, and refreshes evidence through the account-scoped snapshot endpoint without reactivating or editing the watcher.
- Archive card values use the neutral Recorded comparison label for changed, unchanged, incomplete and outage checks; the incident badge conveys the actual result class. Missing historical regional timestamps are explicitly unavailable.

## October 10, 2026 source corrections

- Light soft-copy text uses `#68657c`; the original lighter palette is retained above as reference history. Validate actual rendered surfaces, control states and both themes before claiming AA contrast.
- Recipient search results are a named group of ordinary buttons in form reading order. Input help and a concise status region describe available matches; keeping focus inside the widget keeps suggestions available. The phone layout no longer relocates suggestions to the viewport edge.
- Validation summaries remain in the form's reading flow; watcher summaries appear inside the scrollable editor body to preserve its fixed header/action geometry. Owner watching-region errors also name the field context.
- Report polls update status/file cells in place and retain the request controls, scope/period selections and focus. Completion/failure is announced once. Read HTML report offers the same report model when available; existing PDFs remain a separate untagged download.
- Customer route titles reflect the current heading. Intentional navigation focuses that heading; passive polling does not. Modal opener identity includes the result snapshot as well as watcher and action.
- Archive filter counts and evidence-loading failures have targeted status semantics. A failed change overlay has visible explanatory text next to its disabled checkbox, with an associated description and Reload evidence recovery.
- My profile identifies country/region purposes for autofill, exposes an authenticated profile/membership-only JSON download, and points other privacy requests to support.

These source corrections are not rendered or assistive-technology results. See [accessibility and browser QA](accessibility.md) for finding coverage, deferred visual equivalence work and owner-run scenarios.

## 0.5.14 phone navigation and branding

The phone customer rail is viewport-fixed and the portal reserves its safe-area-aware height. The close toggle therefore stays with the scrolling menu; the menu scrolls within the available dynamic viewport and has 1rem item gaps. The public overlay instead keeps its logo/close header outside a separately scrolling links region; the steward phone rail is also fixed. The supplied light/dark full/compact outlines replace the simulated brand mark. `apps/shared/brand.css` loads last and selects the appropriate asset. Validate actual short-portrait/landscape/zoom/touch geometry; the new real-browser regressions are authored but unexecuted.
