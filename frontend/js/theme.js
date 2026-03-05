// Theme Manager
const ThemeManager = {
  current: 'dark',

  init() {
    const saved = localStorage.getItem('theme') || 'dark';
    this.set(saved);

    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggle();
    });
  },

  set(theme) {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  },

  toggle() {
    this.set(this.current === 'dark' ? 'light' : 'dark');
  }
};
