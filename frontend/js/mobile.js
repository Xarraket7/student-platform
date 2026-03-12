// Mobile Helpers
const Mobile = {
  isMobile() {
    return window.innerWidth <= 768;
  },

  init() {
    this.initBottomBar();
    this.initSearchOverlay();
    this.initChatMobileView();
    this.initCollapsibleHeaders();
    this.initMobileLogout();
    this.handleResize();
  },

  // Bottom tab bar navigation
  initBottomBar() {
    const bar = document.getElementById('mobile-bottom-bar');
    if (!bar) return;

    bar.querySelectorAll('.mobile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const page = tab.dataset.page;
        if (page) Router.navigate(page);
      });
    });
  },

  // Update active tab in bottom bar
  updateBottomBar(page) {
    const bar = document.getElementById('mobile-bottom-bar');
    if (!bar) return;

    // Map community-inner to communities tab
    const tabPage = (page === 'community-inner') ? 'communities' : page;

    bar.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
    const active = bar.querySelector(`.mobile-tab[data-page="${tabPage}"]`);
    if (active) active.classList.add('active');

    // Hide bottom bar on admin (full-screen page)
    if (page === 'admin') {
      bar.style.display = 'none';
    } else {
      bar.style.display = '';
    }
  },

  // Search overlay: expand from icon tap
  initSearchOverlay() {
    const searchBar = document.querySelector('.nav-left .search-bar');
    const overlay = document.getElementById('mobile-search-overlay');
    const closeBtn = document.getElementById('mobile-search-close');
    const input = document.getElementById('mobile-search-input');

    if (!searchBar || !overlay) return;

    searchBar.addEventListener('click', (e) => {
      if (!this.isMobile()) return;
      e.preventDefault();
      e.stopPropagation();
      overlay.classList.add('active');
      setTimeout(() => input && input.focus(), 150);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    }
  },

  // Collapsible section header descriptions (mobile only)
  initCollapsibleHeaders() {
    if (!this.isMobile()) return;

    document.querySelectorAll('.section-header p').forEach(p => {
      if (!p.textContent.trim()) return;
      if (p.parentElement && p.parentElement.classList.contains('section-desc-wrapper')) return;

      // Wrap text in a collapsible container
      const wrapper = document.createElement('div');
      wrapper.className = 'section-desc-wrapper';
      p.parentNode.insertBefore(wrapper, p);
      wrapper.appendChild(p);

      // Add toggle button AFTER wrapper (so it's always visible)
      const toggle = document.createElement('button');
      toggle.className = 'section-desc-toggle';
      toggle.textContent = 'Подробнее';
      wrapper.parentNode.insertBefore(toggle, wrapper.nextSibling);

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.toggle('expanded');
        toggle.textContent = isOpen ? 'Скрыть' : 'Подробнее';
      });
    });
  },

  // Chat split-view: contacts ↔ chat window
  initChatMobileView() {
    if (typeof Chat === 'undefined') return;

    const origOpenChat = Chat.openChat ? Chat.openChat.bind(Chat) : null;
    if (!origOpenChat) return;

    Chat.openChat = function(userId, contactEl) {
      origOpenChat(userId, contactEl);
      if (Mobile.isMobile()) {
        const layout = document.querySelector('.chat-layout');
        if (layout) layout.classList.add('mobile-chat-open');
        Mobile.addChatBackButton();
      }
    };
  },

  addChatBackButton() {
    const header = document.getElementById('chat-window-header');
    if (!header || header.querySelector('.mobile-chat-back')) return;

    const btn = document.createElement('button');
    btn.className = 'mobile-chat-back';
    btn.innerHTML = '&#8249;';
    btn.addEventListener('click', () => {
      const layout = document.querySelector('.chat-layout');
      if (layout) layout.classList.remove('mobile-chat-open');
    });
    header.prepend(btn);
  },

  // Mobile logout — mirror sidebar logout button
  initMobileLogout() {
    const mobileBtn = document.getElementById('mobile-logout-btn');
    const sidebarBtn = document.getElementById('logout-btn');
    if (!mobileBtn || !sidebarBtn) return;

    mobileBtn.addEventListener('click', () => {
      sidebarBtn.click();
    });

    // Sync text with sidebar button
    const sidebarText = document.getElementById('auth-action-text');
    const mobileText = document.getElementById('mobile-auth-action-text');
    if (sidebarText && mobileText) {
      mobileText.textContent = sidebarText.textContent;
      new MutationObserver(() => {
        mobileText.textContent = sidebarText.textContent;
      }).observe(sidebarText, { childList: true, characterData: true, subtree: true });
    }
  },

  // Clean up on resize to desktop
  handleResize() {
    let wasDesktop = !this.isMobile();
    window.addEventListener('resize', () => {
      const isDesktop = !this.isMobile();
      if (isDesktop && !wasDesktop) {
        const chatLayout = document.querySelector('.chat-layout');
        if (chatLayout) chatLayout.classList.remove('mobile-chat-open');
        const overlay = document.getElementById('mobile-search-overlay');
        if (overlay) overlay.classList.remove('active');
      }
      wasDesktop = isDesktop;
    });
  }
};
