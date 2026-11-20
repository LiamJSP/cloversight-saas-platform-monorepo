(function () {
  'use strict';

  const STORAGE_KEY = 'webwatch-theme';
  const LIGHT = 'light';
  const DARK = 'dark';

  function normalized(value) {
    return value === DARK ? DARK : LIGHT;
  }

  function storedTheme() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === DARK || value === LIGHT ? value : null;
    } catch { return null; }
  }

  let explicitTheme = storedTheme();
  const configuredDefault = document.documentElement.dataset.defaultTheme === LIGHT ? LIGHT : DARK;
  const preferredTheme = () => explicitTheme ?? configuredDefault;

  function updateControls(theme) {
    const dark = theme === DARK;
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      button.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = dark ? 'Light mode' : 'Dark mode';
    });
  }

  function applyTheme(value, persist = false) {
    const theme = normalized(value);
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeSource = persist || explicitTheme ? 'user' : 'default';
    // `only light` prevents Chromium's automatic darkening from transforming
    // the explicitly designed light palette. Dark mode advertises native dark
    // controls so form fields and scrollbars stay coherent with our tokens.
    document.documentElement.style.colorScheme = theme === DARK ? DARK : 'only light';
    const colorScheme = document.querySelector('meta[name="color-scheme"]');
    if (colorScheme) colorScheme.content = theme === DARK ? DARK : LIGHT;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === DARK ? '#100e17' : '#fcf9fb';
    if (persist) {
      explicitTheme = theme;
      try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
    }
    updateControls(theme);
    return theme;
  }

  // Apply a complete palette before stylesheets render. CLOVERSIGHT defaults to
  // dark across public and authenticated surfaces; an explicit saved choice is
  // still respected as a complete palette rather than a partial browser hint.
  applyTheme(preferredTheme());

  document.addEventListener('DOMContentLoaded', () => updateControls(normalized(document.documentElement.dataset.theme)));
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-toggle]');
    if (!button) return;
    const next = document.documentElement.dataset.theme === DARK ? LIGHT : DARK;
    applyTheme(next, true);
  });
  addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    explicitTheme = event.newValue === DARK || event.newValue === LIGHT ? event.newValue : null;
    applyTheme(preferredTheme());
  });

  window.CloverSightTheme = Object.freeze({ apply: applyTheme, current: () => normalized(document.documentElement.dataset.theme) });
})();
