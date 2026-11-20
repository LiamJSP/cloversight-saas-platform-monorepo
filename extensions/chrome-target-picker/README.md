# CLOVERSIGHT Target Picker (Chrome Manifest V3)

The extension lets a customer select dynamic DOM regions that CLOVERSIGHT removes before visible-text extraction and screenshot capture. It asks only for `activeTab`, `scripting`, and `storage`; it has no host-wide permission, analytics, remote code, or network calls.

## Install locally

1. Run `npm run package:extension`, or use this directory directly.
2. Open `chrome://extensions` in Chrome or Chromium.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select this directory or `dist/extension`.
5. Open an HTTP(S) page, click the extension, and choose **Start picking**.
6. Click dynamic regions. Press Escape or use **Finish picking**.
7. Export the JSON and import it in the watcher editor.

Selectors are stored per origin in `chrome.storage.local`. Review them after a major page redesign. The picker does not collect page text, screenshots, form values, cookies, or authentication material.
