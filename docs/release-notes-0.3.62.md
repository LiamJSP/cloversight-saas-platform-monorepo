# CLOVERSIGHT 0.3.62 release notes

## Interface refinements

- Watcher action-menu controls now use an explicit centered column layout at every breakpoint.
- Each action icon occupies its own row above a centered, wrapping label.
- The complete icon/label group is centered horizontally and vertically within an 82-pixel minimum-height action.
- Compact and mobile action menus no longer fall back to left-aligned horizontal icon/label rows.
- Steward confirmation footer buttons now share an exact 50-pixel height, margin, padding, alignment, and line-height contract.
- Destructive steward confirmation labels remain white in default, hover, and keyboard-focus states.

## Deployment identity

- Runtime diagnostics and static asset keys advance to `0.3.62`.
- The complete-source worker image label advances to `lambda-chromium149-playwright-1.61.0-node22-r34-*`.
