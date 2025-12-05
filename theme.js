(function () {
  const THEME_KEY = 'theme';
  const root = document.documentElement;

  const prefersDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return prefersDark() ? 'dark' : 'light';
  }

  function updateIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function applyTheme(theme, { persist = true } = {}) {
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    if (persist) localStorage.setItem(THEME_KEY, theme);
    updateIcon(theme);
  }

  // Apply the initial theme as early as possible
  applyTheme(getPreferredTheme(), { persist: false });

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const nextTheme = root.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(nextTheme);
      });
    }
    // Ensure the icon reflects the current mode when the DOM is ready
    updateIcon(root.classList.contains('dark') ? 'dark' : 'light');
  });
})();
