// Feed Page
const Feed = {
  posts: [],

  async load() {
    this.loadCommunityIcons();
    this.loadPosts();
    this.loadRightSidebar();
    this.setupPublishBar();
  },

  async loadCommunityIcons() {
    try {
      const communities = await API.get('/communities');
      const container = document.getElementById('feed-community-icons');
      container.innerHTML = communities.slice(0, 6).map(c => `
        <img src="assets/icons/feed/${c.feed_icon}" alt="${c.title}"
             class="feed-community-icon" data-slug="${c.slug}" title="${c.title}">
      `).join('');

      container.querySelectorAll('.feed-community-icon').forEach(icon => {
        icon.addEventListener('click', async () => {
          if (!Auth.user || Auth.user.role === 'guest') {
            Router.navigate('communities');
            return;
          }
          const slug = icon.dataset.slug;
          try {
            const community = await API.get(`/communities/${slug}`);
            Router.goToCommunity(community);
          } catch (e) { showToast(e.message); }
        });
      });

      // Animate
      gsap.fromTo(container.children, { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.5)' });
    } catch (e) { console.error(e); }
  },

  currentPostIndex: 0,

  async loadPosts() {
    try {
      const posts = await API.get('/posts/feed');
      this.posts = posts;
      const container = document.getElementById('feed-posts');

      if (posts.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">Пока нет публикаций</p>';
        return;
      }

      container.innerHTML = posts.map(post => this.renderPost(post)).join('');

      // Show first post
      this.currentPostIndex = 0;
      this.showPost(0);

      // Like handlers
      container.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => this.toggleLike(btn));
      });

      // Comment handlers
      container.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); this.openComments(btn.dataset.postId, btn); });
      });

      // Carousel navigation
      document.getElementById('posts-prev').addEventListener('click', () => this.prevPost());
      document.getElementById('posts-next').addEventListener('click', () => this.nextPost());

    } catch (e) { console.error(e); }
  },

  isAnimating: false,

  showPost(index, direction = 'none') {
    const cards = document.querySelectorAll('.post-card');
    if (!cards[index]) return;

    // First load — no transition, just show with stagger entrance
    if (direction === 'none') {
      cards.forEach(c => { c.classList.remove('active', 'animating-out'); });
      cards[index].classList.add('active');
      gsap.set(cards[index], { x: 0, opacity: 1, scale: 1 });
      this.animateElementsIn(cards[index], 'right');
      return;
    }

    if (this.isAnimating) return;
    this.isAnimating = true;

    const currentCard = document.querySelector('.post-card.active');
    const nextCard = cards[index];
    const slideOut = direction === 'right' ? -40 : 40;
    const slideIn = direction === 'right' ? 40 : -40;

    // Animate current card OUT
    if (currentCard && currentCard !== nextCard) {
      currentCard.classList.remove('active');
      currentCard.classList.add('animating-out');

      gsap.to(currentCard, {
        x: slideOut,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.inOut',
        onComplete: () => {
          currentCard.classList.remove('animating-out');
          gsap.set(currentCard, { clearProps: 'all' });
        }
      });
    }

    // Animate new card IN
    nextCard.classList.add('active');
    gsap.fromTo(nextCard,
      { x: slideIn, opacity: 0 },
      {
        x: 0, opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.05,
        onComplete: () => {
          this.isAnimating = false;
        }
      }
    );

    // Animate individual elements with stagger
    this.animateElementsIn(nextCard, direction);
  },

  animateElementsIn(card, direction) {
    const fromX = direction === 'right' ? 40 : -40;
    const banner = card.querySelector('.post-banner');
    const avatar = card.querySelector('.post-avatar');
    const authorName = card.querySelector('.post-author-name');
    const authorRole = card.querySelector('.post-author-role');
    const content = card.querySelector('.post-content');
    const actions = card.querySelector('.post-actions');

    // Banner image — subtle zoom-in with clip
    if (banner) {
      gsap.fromTo(banner,
        { scale: 1.08 },
        { scale: 1, duration: 1.2, ease: 'power2.out', delay: 0.05 }
      );
    }

    // Avatar — pop in with bounce
    if (avatar) {
      gsap.fromTo(avatar,
        { scale: 0, opacity: 0, rotation: -20 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.6, ease: 'back.out(2)', delay: 0.2 }
      );
    }

    // Author name — slide from direction
    if (authorName) {
      gsap.fromTo(authorName,
        { x: fromX, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.3 }
      );
    }

    // Author role — fade up
    if (authorRole) {
      gsap.fromTo(authorRole,
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', delay: 0.38 }
      );
    }

    // Content text — slide up with reveal feel
    if (content) {
      gsap.fromTo(content,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', delay: 0.4 }
      );
    }

    // Actions — slide up + stagger each action
    if (actions) {
      const actionItems = actions.querySelectorAll('.post-action');
      gsap.fromTo(actions,
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out', delay: 0.5 }
      );
      gsap.fromTo(actionItems,
        { y: 10, opacity: 0, scale: 0.8 },
        { y: 0, opacity: 1, scale: 1, duration: 0.35, stagger: 0.08, ease: 'back.out(1.5)', delay: 0.55 }
      );
    }
  },

  nextPost() {
    const cards = document.querySelectorAll('.post-card');
    const newIndex = (this.currentPostIndex + 1) % cards.length;
    this.currentPostIndex = newIndex;
    this.showPost(newIndex, 'right');
  },

  prevPost() {
    const cards = document.querySelectorAll('.post-card');
    const newIndex = (this.currentPostIndex - 1 + cards.length) % cards.length;
    this.currentPostIndex = newIndex;
    this.showPost(newIndex, 'left');
  },

  renderPost(post) {
    const communityAvatar = post.community_icon ? `assets/avatars/${post.community_icon}` : 'assets/avatars/Admin.png';
    const imageSrc = post.image ? (post.image.startsWith('Rectangle') ? `assets/backgrounds/banners/${post.image}` : `/uploads/${post.image}`) : '';
    const communityName = post.community_title || 'Сообщество';

    return `
      <div class="post-card" data-post-id="${post.id}">
        <div class="post-banner" style="background-image: url('${imageSrc}')">
          <div class="post-banner-content">
            <div class="post-header">
              <img src="${communityAvatar}" alt="" class="post-avatar">
              <div class="post-author-info">
                <div class="post-author-name">${communityName}</div>
                <div class="post-author-role">Админ</div>
              </div>
            </div>
            <div class="post-content">${post.content}</div>
            <div class="post-actions">
              <div class="post-action like-btn" data-post-id="${post.id}">
                <img src="assets/icons/nav/Лайк 1.png" alt="">
                <span class="like-count">${post.likes_count || 0}</span>
              </div>
              <div class="post-action comment-btn" data-post-id="${post.id}">
                <img src="assets/icons/nav/Комм.png" alt="">
                <span>${post.comments_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async toggleLike(btn) {
    if (!Auth.isLoggedIn()) return showToast('Войдите, чтобы ставить лайки');
    const postId = btn.dataset.postId;
    try {
      const result = await API.post(`/posts/${postId}/like`, {});
      const countEl = btn.querySelector('.like-count');
      let count = parseInt(countEl.textContent);
      if (result.liked) {
        btn.classList.add('liked');
        countEl.textContent = count + 1;
        btn.querySelector('img').classList.add('like-pulse');
        setTimeout(() => btn.querySelector('img').classList.remove('like-pulse'), 300);
      } else {
        btn.classList.remove('liked');
        countEl.textContent = Math.max(0, count - 1);
      }
    } catch (e) { showToast(e.message); }
  },

  commentsPopup: null,

  closeComments() {
    if (this.commentsPopup) {
      gsap.to(this.commentsPopup, {
        opacity: 0, scale: 0.95, duration: 0.15,
        onComplete: () => {
          this.commentsPopup?.remove();
          this.commentsPopup = null;
        }
      });
    }
  },

  async openComments(postId, anchorEl) {
    if (!Auth.isLoggedIn()) return showToast('Войдите, чтобы комментировать');
    this.closeComments();

    const popup = document.createElement('div');
    popup.className = 'comments-popup';
    popup.dataset.postId = postId;
    popup.innerHTML = `
      <div class="comments-popup-header">
        <span>Комментарии</span>
        <button class="comments-popup-close">&times;</button>
      </div>
      <div class="comments-popup-list"></div>
      <div class="comments-popup-input">
        <input type="text" placeholder="Написать..." class="comments-popup-field">
        <button class="comments-popup-send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(popup);
    this.commentsPopup = popup;

    // Position near the comment button
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const btnRect = anchorEl.getBoundingClientRect();
    const pw = 340;                       // popup CSS width
    const ph = 420;                       // popup CSS max-height
    const bLeft = btnRect.left / zoom;
    const bTop = btnRect.top / zoom;
    const bBottom = btnRect.bottom / zoom;
    const bCenterX = bLeft + (btnRect.width / zoom) / 2;
    const vw = window.innerWidth / zoom;
    const vh = window.innerHeight / zoom;

    // Place popup above-right of the button, as if coming out from the icon
    const bRight = bLeft + (btnRect.width / zoom);
    let left = bRight + 8;
    let top = bTop - ph + 20;

    // Keep within viewport horizontally
    if (left < 10) left = 10;
    if (left + pw > vw - 10) left = vw - pw - 10;

    // Keep within viewport vertically
    if (top + ph > vh - 10) top = vh - ph - 10;
    if (top < 10) top = 10;

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';

    gsap.fromTo(popup,
      { opacity: 0, scale: 0.95, y: 6 },
      { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'back.out(2)' }
    );

    // Load comments
    try {
      const comments = await API.get(`/posts/${postId}/comments`);
      const list = popup.querySelector('.comments-popup-list');
      if (comments.length === 0) {
        list.innerHTML = '<div class="comments-popup-empty">Пока нет комментариев</div>';
      } else {
        list.innerHTML = comments.map(c => `
          <div class="comment-item">
            <img src="assets/avatars/${c.user_avatar || 'Admin.png'}" alt="" class="comment-avatar">
            <div class="comment-body">
              <div class="comment-name">${c.user_name}</div>
              <div class="comment-text">${c.text}</div>
              <div class="comment-time">${formatTime(c.created_at)}</div>
            </div>
          </div>
        `).join('');
        list.scrollTop = list.scrollHeight;
      }
    } catch (e) { console.error(e); }

    // Close button
    popup.querySelector('.comments-popup-close').addEventListener('click', () => this.closeComments());

    // Send comment
    const sendBtn = popup.querySelector('.comments-popup-send');
    const inputField = popup.querySelector('.comments-popup-field');

    const sendComment = async () => {
      const text = inputField.value.trim();
      if (!text) return;
      try {
        const comment = await API.post(`/posts/${postId}/comments`, { text });
        const list = popup.querySelector('.comments-popup-list');
        const empty = list.querySelector('.comments-popup-empty');
        if (empty) empty.remove();
        const html = `
          <div class="comment-item">
            <img src="assets/avatars/${comment.user_avatar || 'Admin.png'}" alt="" class="comment-avatar">
            <div class="comment-body">
              <div class="comment-name">${comment.user_name}</div>
              <div class="comment-text">${comment.text}</div>
              <div class="comment-time">только что</div>
            </div>
          </div>
        `;
        list.insertAdjacentHTML('beforeend', html);
        const newItem = list.lastElementChild;
        gsap.fromTo(newItem, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25 });
        list.scrollTop = list.scrollHeight;
        inputField.value = '';
      } catch (e) { showToast(e.message); }
    };

    sendBtn.addEventListener('click', sendComment);
    inputField.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendComment(); });

    // Close on click outside
    setTimeout(() => {
      const closeHandler = (e) => {
        if (!popup.contains(e.target) && !anchorEl.contains(e.target)) {
          this.closeComments();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 10);
  },

  async loadRightSidebar() {
    try {
      const events = await API.get('/events');
      const eventsContainer = document.getElementById('feed-events-list');
      eventsContainer.innerHTML = events.slice(0, 4).map(e => `
        <div class="event-mini">
          <img src="assets/icons/events/${e.icon}" alt="" class="event-mini-icon">
          <div class="event-mini-info">
            <div class="event-mini-title">${e.title}</div>
            ${e.event_date ? `<div class="event-mini-date">${formatDate(e.event_date)}</div>` : ''}
          </div>
        </div>
      `).join('');
    } catch (e) {}

    try {
      const announcements = await API.get('/announcements');
      const annContainer = document.getElementById('feed-announcements-list');
      annContainer.innerHTML = announcements.slice(0, 2).map(a => `
        <div class="announcement-mini">
          <div class="announcement-mini-title">${a.title}</div>
          <div class="announcement-mini-text">${a.description?.substring(0, 80)}...</div>
        </div>
      `).join('');
    } catch (e) {}

    // Friends online — delegate to Friends module
    Friends.loadOnlineFriends();
  },

  setupPublishBar() {
    const bar = document.getElementById('publish-bar');
    if (bar) {
      bar.addEventListener('click', () => {
        if (Auth.isAdmin()) {
          Router.navigate('admin');
        } else {
          showToast('Доступно только администратору. Напишите ему в чате.');
        }
      });
    }
  }
};

