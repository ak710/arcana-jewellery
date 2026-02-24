(function () {
  const THEME_KEY = 'theme';
  const root = document.documentElement;
  const body = document.body;

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
    // Apply dark class to both html and body for Tailwind compatibility
    root.classList.toggle('dark', isDark);
    if (body) {
      body.classList.toggle('dark', isDark);
    }
    // Force CSS repaint by triggering reflow
    void root.offsetWidth;
    if (persist) localStorage.setItem(THEME_KEY, theme);
    updateIcon(theme);
    console.debug('Theme applied:', theme);
  }

  // Apply the initial theme as early as possible
  applyTheme(getPreferredTheme(), { persist: false });

  // Also apply when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const isDark = root.classList.contains('dark');
      if (body) {
        body.classList.toggle('dark', isDark);
      }
      updateIcon(isDark ? 'dark' : 'light');
      setupToggleButton();
    });
  } else {
    setupToggleButton();
  }

  function setupToggleButton() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isDark = root.classList.contains('dark');
        const nextTheme = isDark ? 'light' : 'dark';
        applyTheme(nextTheme);
      });
    }
  }
})();
