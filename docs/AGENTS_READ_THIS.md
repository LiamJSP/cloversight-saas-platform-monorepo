# Agent notes for CLOVERSIGHT documentation

- Read the relevant files in `docs/` before changing core behavior. After a major code change, update the matching guide and regenerate affected reference tables or diagrams.
- When changing a framework or key dependency, update `docs/documentation.md` and the appropriate architecture or surface guide, along with its versioned dependency file.
- Use the implementation and CloudFormation templates as the source of truth. Mark local behavior, configured AWS behavior and unverified live behavior distinctly.
- Leave historical changelogs and release notes intact; make current-state corrections in the core guides.
- If a mistake repeats in the codebase, or the user points out a recurring mistake, add one short warning here with the corrective action and a link to the relevant guide.
- Keep commands executable from the repository root and keep generated docs reproducible from checked-in source.
- Keep every repository `.sh` file executable (mode `0755`), including new scripts. Preserve those permissions when packaging or extracting project ZIPs.
- Keep routine CloudTrail audit scans filtered and bounded by both pages and time; never default to account-wide unbounded history. See [cloud audit collection](cloud-audit-collection.md).
- Preserve the owner-requested staging ChatGPT exception at both edge and Cognito WAF layers; do not silently remove it or mistake header matching for authentication. See [staging browser access](staging-browser-access.md).
- Keep comparison evidence bound to its actual account, watcher, Region and source snapshot; never relabel carried-forward evidence as the latest capture or treat an unavailable comparison as unchanged. See [comparison locality](architecture.md#storage-layout-and-comparison-locality).
- Review the final customer CSS cascade at phone breakpoints: desktop row heights and shared `body.pico` control rules must not override mobile record height or modal scrolling. See [responsive contract](customer-portal-design-system.md#responsive-and-accessibility-contract).

- Rebranding must preserve deployed resource names, allocation-tag values, token claims and persisted storage keys until an explicit migration is designed. Compare parsed CloudFormation values, not just visible text. See [branding](branding.md).
- Keep mobile navigation close controls outside the menu scroll area and keep the phone navbar attached to the viewport. Use the real short-portrait browser regression, not CSS-text assertions, for acceptance.

- A Node-major trial must distinguish host/service verification, Docker browser Node and deployed Lambda Node. Keep browser driver/image/native Chromium versions coordinated; never invent lock integrity or call upstream release availability successful project testing. See [Node 24/dependency review](node24-dependency-upgrade.md).
