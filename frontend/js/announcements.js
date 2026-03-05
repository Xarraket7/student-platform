// Announcements Page
const Announcements = {
  list: [],
  currentIndex: 0,
  isActive: false,
  originalBg: '',

  async load() {
    try {
      const announcements = await API.get('/announcements');
      this.list = announcements;

      if (announcements.length === 0) return;

      // If page is already active, set the background now
      if (this.isActive && this.list.length > 0) {
        this.setPageBackground(this.list[0]?.background);
      }

      // Create dots
      const dotsContainer = document.getElementById('announcement-dots');
      dotsContainer.innerHTML = announcements.map((_, i) =>
        `<span class="announcement-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
      ).join('');

      dotsContainer.querySelectorAll('.announcement-dot').forEach(dot => {
        dot.addEventListener('click', () => this.goTo(parseInt(dot.dataset.index)));
      });

      // Nav buttons
      document.getElementById('announcement-prev').onclick = () => this.prev();
      document.getElementById('announcement-next').onclick = () => this.next();

      this.show(0, true);
    } catch (e) { console.error(e); }
  },

  setPageBackground(bgFile) {
    if (!bgFile) return;
    const bg = document.getElementById('app-background');
    if (bg) {
      bg.style.backgroundImage = `url('assets/backgrounds/announcements/${bgFile}')`;
    }
  },

  show(index, instant = false) {
    if (this.list.length === 0) return;
    this.currentIndex = index;
    const ann = this.list[index];

    // Update MAIN PAGE background (#app-background)
    if (this.isActive && ann.background) {
      const bg = document.getElementById('app-background');
      if (instant) {
        this.setPageBackground(ann.background);
        gsap.set(bg, { opacity: 1 });
      } else {
        gsap.to(bg, { opacity: 0, duration: 0.4, onComplete: () => {
          this.setPageBackground(ann.background);
          gsap.to(bg, { opacity: 1, duration: 0.6 });
        }});
      }
    }

    // Update content
    const title = document.getElementById('announcement-title');
    const desc = document.getElementById('announcement-description');
    const imgContainer = document.getElementById('announcement-image');

    if (instant) {
      title.textContent = ann.title;
      desc.textContent = ann.description;
      if (ann.image) {
        imgContainer.innerHTML = `<img src="assets/backgrounds/announcements/${ann.image}" alt="">`;
        imgContainer.style.display = '';
      } else {
        imgContainer.innerHTML = '';
        imgContainer.style.display = 'none';
      }
      gsap.set([title, desc, imgContainer], { opacity: 1, x: 0 });
    } else {
      gsap.to([title, desc, imgContainer], { opacity: 0, x: -20, duration: 0.3, onComplete: () => {
        title.textContent = ann.title;
        desc.textContent = ann.description;
        if (ann.image) {
          imgContainer.innerHTML = `<img src="assets/backgrounds/announcements/${ann.image}" alt="">`;
          imgContainer.style.display = '';
        } else {
          imgContainer.innerHTML = '';
          imgContainer.style.display = 'none';
        }
        gsap.to([title, desc, imgContainer], { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' });
      }});
    }

    // Update dots
    document.querySelectorAll('.announcement-dot').forEach((d, i) => {
      d.classList.toggle('active', i === index);
    });
  },

  activate() {
    // Don't change background/mode for guests
    const guestWarning = document.getElementById('announcements-guest-warning');
    if (guestWarning && guestWarning.style.display === 'flex') {
      this.isActive = false;
      return;
    }
    this.isActive = true;

    // Save original background
    const bg = document.getElementById('app-background');
    this.originalBg = bg.style.backgroundImage || '';

    // Set announcements background if data loaded
    if (this.list.length > 0) {
      this.setPageBackground(this.list[this.currentIndex]?.background);
    }

    // Add mode class for transparent panels
    document.body.classList.add('announcements-mode');
  },

  deactivate() {
    this.isActive = false;
    // Restore original background
    const bg = document.getElementById('app-background');
    bg.style.backgroundImage = this.originalBg;
    gsap.set(bg, { opacity: 1 });

    // Remove mode class
    document.body.classList.remove('announcements-mode');
  },

  next() {
    this.goTo((this.currentIndex + 1) % this.list.length);
  },

  prev() {
    this.goTo((this.currentIndex - 1 + this.list.length) % this.list.length);
  },

  goTo(index) {
    this.show(index);
  }
};
