// Auth Manager
const Auth = {
  user: null,
  bgInterval: null,

  init() {
    // Auth background slider (4-second interval)
    this.setupBgSlider();

    // Login
    document.getElementById('login-btn').addEventListener('click', () => this.login());
    document.getElementById('register-btn').addEventListener('click', () => this.register());

    // Quick login buttons
    document.querySelectorAll('.quick-login-btn').forEach(btn => {
      btn.addEventListener('click', () => this.quickLogin(btn.dataset.role));
    });

    // Google login
    this.initGoogleLogin();

    // Toggle forms
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('register-form').style.display = 'block';
    });
    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('register-form').style.display = 'none';
      document.getElementById('login-form').style.display = 'block';
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      if (this.user) {
        this.logout();
      } else {
        this.showAuthPage();
      }
    });

    // Guest login buttons
    document.querySelectorAll('.guest-login-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showAuthPage());
    });

    // Enter key for login
    document.getElementById('login-password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.login();
    });
  },

  setupBgSlider() {
    let currentBg = 1;
    this.bgInterval = setInterval(() => {
      const bg1 = document.querySelector('.auth-bg-1');
      const bg2 = document.querySelector('.auth-bg-2');
      if (currentBg === 1) {
        bg1.classList.remove('active');
        bg2.classList.add('active');
        currentBg = 2;
      } else {
        bg2.classList.remove('active');
        bg1.classList.add('active');
        currentBg = 1;
      }
    }, 4000);
  },

  stopBgSlider() {
    if (this.bgInterval) {
      clearInterval(this.bgInterval);
      this.bgInterval = null;
    }
  },

  initGoogleLogin() {
    const tryInit = async () => {
      try {
        const data = await API.get('/auth/google-client-id');
        if (!data.clientId || data.clientId === 'your_google_client_id') {
          console.warn('Google Client ID не настроен');
          return;
        }

        const waitForGsi = () => {
          if (typeof google === 'undefined' || !google.accounts) {
            setTimeout(waitForGsi, 200);
            return;
          }

          google.accounts.id.initialize({
            client_id: data.clientId,
            callback: (response) => this.handleGoogleCredential(response),
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render real Google buttons
          const btnOptions = {
            theme: 'outline',
            size: 'large',
            width: 356,
            text: 'signin_with',
            shape: 'rectangular',
            locale: 'ru',
          };

          const loginBtn = document.getElementById('google-login-btn');
          if (loginBtn) {
            google.accounts.id.renderButton(loginBtn, btnOptions);
          }

          const registerBtn = document.getElementById('google-register-btn');
          if (registerBtn) {
            google.accounts.id.renderButton(registerBtn, { ...btnOptions, text: 'signup_with' });
          }

          // Mobile: visible Google buttons trigger prompt directly
          document.querySelectorAll('.google-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              if (window.innerWidth <= 768) {
                e.preventDefault();
                e.stopPropagation();
                google.accounts.id.prompt();
              }
            });
          });
        };

        waitForGsi();
      } catch (e) {
        console.warn('Google login init error:', e);
      }
    };

    tryInit();
  },

  async handleGoogleCredential(response) {
    try {
      const data = await API.post('/auth/google', { credential: response.credential });
      this.user = data.user;
      this.onLogin();
    } catch (err) {
      showToast(err.message || 'Ошибка входа через Google');
    }
  },

  async checkAuth() {
    try {
      const data = await API.get('/auth/me');
      if (data.user) {
        this.user = data.user;
        this.onLogin();
        return true;
      }
    } catch (e) {}
    return false;
  },

  async login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) return showToast('Заполните все поля');

    try {
      const data = await API.post('/auth/login', { email, password });
      this.user = data.user;
      this.onLogin();
    } catch (err) {
      showToast(err.message);
    }
  },

  async register() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    if (!name || !email || !password) return showToast('Заполните все поля');

    try {
      const data = await API.post('/auth/register', { name, email, password });
      this.user = data.user;
      this.onLogin();
    } catch (err) {
      showToast(err.message);
    }
  },

  async quickLogin(role) {
    try {
      const data = await API.post('/auth/quick-login', { role });
      this.user = data.user;
      this.onLogin();
    } catch (err) {
      showToast(err.message);
    }
  },

  async logout() {
    try {
      await API.post('/auth/logout', {});
    } catch (e) {}
    this.user = null;
    this.onLogout();
  },

  onLogin() {
    this.stopBgSlider();
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    this.updateUI();
    Router.navigate(Router.currentPage || 'feed');
  },

  onLogout() {
    this.updateUI();
    this.showAuthPage();
  },

  showAuthPage() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-page').style.display = 'flex';
    this.setupBgSlider();
  },

  showApp() {
    this.stopBgSlider();
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
  },

  updateUI() {
    const isLoggedIn = this.user && this.user.role !== 'guest';
    const isAdmin = this.user?.role === 'admin';

    // Update mini profile
    document.getElementById('user-name-mini').textContent = this.user?.name || 'Гость';
    const roleMini = document.getElementById('user-role-mini');
    if (roleMini) {
      const roleMap = { admin: 'администратор', student: 'студент', guest: 'гость' };
      roleMini.textContent = roleMap[this.user?.role] || 'студент';
    }
    const avatarMini = document.getElementById('user-avatar-mini');
    if (this.user?.avatar) {
      avatarMini.src = `assets/avatars/${this.user.avatar}`;
    }

    // Auth action text
    document.getElementById('auth-action-text').textContent = isLoggedIn ? 'Выйти' : 'Войти';

    // Admin button
    document.getElementById('admin-panel-btn').style.display = isAdmin ? 'flex' : 'none';

    // Guest warnings
    const showGuestWarning = !isLoggedIn;
    document.getElementById('chat-guest-warning').style.display = showGuestWarning ? 'flex' : 'none';
    document.getElementById('chat-container').style.display = showGuestWarning ? 'none' : 'flex';
    document.getElementById('profile-guest-warning').style.display = showGuestWarning ? 'flex' : 'none';
    document.getElementById('profile-container').style.display = showGuestWarning ? 'none' : 'flex';
    document.getElementById('communities-guest-warning').style.display = showGuestWarning ? 'flex' : 'none';
    document.getElementById('communities-grid').style.display = showGuestWarning ? 'none' : 'grid';
    document.getElementById('announcements-guest-warning').style.display = showGuestWarning ? 'flex' : 'none';
    document.getElementById('announcements-container').style.display = showGuestWarning ? 'none' : 'block';

    // Hide events for guests
    const eventsGrid = document.getElementById('events-grid');
    const eventsWarning = document.getElementById('events-guest-warning');
    if (eventsGrid) eventsGrid.style.display = showGuestWarning ? 'none' : 'grid';
    if (eventsWarning) eventsWarning.style.display = showGuestWarning ? 'flex' : 'none';

    // Hide publish bar for guests
    const publishBar = document.getElementById('publish-bar');
    if (publishBar) {
      publishBar.style.display = (isLoggedIn && isAdmin) ? 'flex' : 'none';
    }
  },

  isLoggedIn() {
    return this.user && this.user.role !== 'guest';
  },

  isAdmin() {
    return this.user?.role === 'admin';
  }
};
