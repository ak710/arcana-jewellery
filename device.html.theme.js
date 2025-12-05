        <script>
          // Initialize theme from localStorage or system preference
          function initTheme() {
            const saved = localStorage.getItem('theme');
            const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.setAttribute('data-theme', theme);
            document.getElementById('theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
          }

          // Toggle theme
          document.getElementById('theme-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            document.getElementById('theme-icon').textContent = next === 'dark' ? '☀️' : '��';
          });

          initTheme();
        </script>
