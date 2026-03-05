// Router
const Router = {
  currentPage: 'feed',
  currentCommunity: null,

  init() {
    // Create slider element
    const navTabs = document.querySelector('.nav-tabs');
    if (navTabs) {
      this.slider = document.createElement('div');
      this.slider.className = 'nav-tabs-slider';
      navTabs.appendChild(this.slider);
      // Position slider on initial active tab
      requestAnimationFrame(() => this.moveSlider(document.querySelector('.nav-tab.active'), false));
    }

    // Nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => this.navigate(tab.dataset.page));
    });

    // Sidebar links
    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
      link.addEventListener('click', () => this.navigate(link.dataset.page));
    });

    // Profile mini click
    document.getElementById('profile-mini').addEventListener('click', () => this.navigate('profile'));
  },

  moveSlider(tab, animate = true) {
    if (!tab || !this.slider) return;
    const left = tab.offsetLeft;
    const width = tab.offsetWidth;
    const height = tab.offsetHeight;
    const top = tab.offsetTop;

    const props = { left, width, height, top };

    if (animate) {
      gsap.to(this.slider, {
        ...props,
        duration: 0.4,
        ease: 'power3.out'
      });
    } else {
      gsap.set(this.slider, props);
    }
  },

  navigate(page, data = null) {
    this.currentPage = page;

    // Restore defaults when leaving special pages
    if (page !== 'community-inner' && page !== 'announcements' && page !== 'chat') {
      document.getElementById('theme-toggle').style.display = '';
      document.body.classList.remove('community-inner-active');
      document.body.classList.remove('chat-page-active');
      document.querySelector('.left-sidebar').style.display = '';
    }

    // Community inner: hide sidebar, add active class for styling
    if (page === 'community-inner') {
      document.querySelector('.left-sidebar').style.display = 'none';
      document.body.classList.add('community-inner-active');
      document.body.classList.remove('chat-page-active');
    }

    // Chat: hide sidebar
    if (page === 'chat') {
      document.querySelector('.left-sidebar').style.display = 'none';
      document.body.classList.add('chat-page-active');
      document.body.classList.remove('community-inner-active');
    } else {
      document.body.classList.remove('chat-page-active');
    }

    // Announcements: hide sidebar + theme toggle, activate full-page bg
    if (page === 'announcements') {
      document.querySelector('.left-sidebar').style.display = 'none';
      document.getElementById('theme-toggle').style.display = 'none';
      document.body.classList.remove('chat-page-active');
      if (typeof Announcements !== 'undefined') Announcements.activate();
    } else {
      if (typeof Announcements !== 'undefined') Announcements.deactivate();
    }

    // Animate page transition
    const currentActive = document.querySelector('.page.active');
    const target = document.getElementById(`page-${page}`);

    if (currentActive && target && currentActive !== target) {
      // Animate old page out
      gsap.to(currentActive, {
        opacity: 0,
        y: -8,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          currentActive.classList.remove('active');
          gsap.set(currentActive, { opacity: 1, y: 0 });

          // Show and animate new page in
          target.classList.add('active');
          gsap.fromTo(target,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
          );
        }
      });
    } else {
      // First load or same page
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      if (target) {
        target.classList.add('active');
        gsap.fromTo(target,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
        );
      }
    }

    // Update active states with animation
    const prevTab = document.querySelector('.nav-tab.active');
    const prevLink = document.querySelector('.sidebar-link.active');
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

    const activeTab = document.querySelector(`.nav-tab[data-page="${page}"]`);
    const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);

    if (activeTab) {
      activeTab.classList.add('active');
      // Slide the indicator to the active tab
      this.moveSlider(activeTab, true);
    }

    if (activeLink) {
      activeLink.classList.add('active');
      gsap.fromTo(activeLink,
        { x: -8, opacity: 0.5 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    }

    // Update background for specific pages
    this.updateBackground(page, data);

    // Load page data
    this.loadPageData(page, data);
  },

  updateBackground(page, data) {
    const bg = document.getElementById('app-background');
    if (page === 'community-inner' && data?.background) {
      bg.style.backgroundImage = `url('assets/backgrounds/communities/${data.background}')`;
    } else if (page === 'announcements') {
      // Announcements module handles its own background
      return;
    } else {
      bg.style.backgroundImage = '';  // Uses CSS variable bg-page
    }
  },

  loadPageData(page, data) {
    switch (page) {
      case 'feed': Feed.load(); break;
      case 'communities': Communities.load(); break;
      case 'community-inner': Communities.loadInner(data); break;
      case 'events': Events.load(); break;
      case 'chat': Chat.load(); break;
      case 'announcements': Announcements.load(); break;
      case 'profile': if (!Profile.viewingUserId) Profile.load(); break;
      case 'admin': Admin.load(); break;
    }
  },

  goToCommunity(community) {
    this.navigate('community-inner', community);
  }
};
