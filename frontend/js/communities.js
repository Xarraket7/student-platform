// Communities Page
const Communities = {
  list: [],
  current: null,
  socket: null,

  async load() {
    try {
      const communities = await API.get('/communities');
      this.list = communities;
      const grid = document.getElementById('communities-grid');
      grid.innerHTML = communities.map(c => `
        <div class="community-card" data-slug="${c.slug}">
          <img src="assets/icons/feed/${c.feed_icon}" alt="${c.title}">
        </div>
      `).join('');

      grid.querySelectorAll('.community-card').forEach(card => {
        card.addEventListener('click', async () => {
          if (!Auth.user || Auth.user.role === 'guest') {
            Router.navigate('communities');
            return;
          }
          const slug = card.dataset.slug;
          try {
            const community = await API.get(`/communities/${slug}`);
            Router.goToCommunity(community);
          } catch (e) { showToast(e.message); }
        });
      });

      // Animate cards
      gsap.fromTo(grid.children, { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' });
    } catch (e) { console.error(e); }
  },

  async loadInner(community) {
    this.current = community;

    // Hide theme toggle - force dark text mode in communities
    document.getElementById('theme-toggle').style.display = 'none';
    document.body.classList.add('community-inner-active');

    // Update header
    document.getElementById('community-title').textContent = community.title;

    // Back button -> go to communities list
    document.getElementById('community-back-btn').onclick = () => {
      Router.navigate('communities');
    };

    // Set background
    if (community.background) {
      document.getElementById('app-background').style.backgroundImage =
        `url('assets/backgrounds/communities/${community.background}')`;
    }

    // Reset tabs
    document.querySelectorAll('#page-community-inner .community-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('#page-community-inner .community-tab[data-tab="news"]').classList.add('active');
    document.querySelectorAll('.community-section').forEach(s => { s.classList.remove('active'); s.style.display = ''; });
    document.getElementById('community-news').classList.add('active');

    // Tab handlers
    document.querySelectorAll('#page-community-inner .community-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('#page-community-inner .community-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.community-section').forEach(s => { s.classList.remove('active'); s.style.display = ''; });
        const target = document.getElementById(`community-${tab.dataset.tab}`);
        target.classList.add('active');
        gsap.fromTo(target, { opacity: 0 }, { opacity: 1, duration: 0.3 });

        if (tab.dataset.tab === 'chat') this.loadChat();
        if (tab.dataset.tab === 'gallery') this.loadGallery();
      };
    });

    this.loadNews();
  },

  async loadNews() {
    if (!this.current) return;
    const userName = Auth.user?.name || 'Гость';

    try {
      const news = await API.get(`/communities/${this.current.slug}/news`);
      const container = document.getElementById('community-news');

      if (news.length === 0) {
        container.innerHTML = `
          <div class="news-grid">
            <div class="news-card news-card-empty"><div class="news-card-empty-text">📰</div></div>
            <div class="news-card news-card-empty"><div class="news-card-empty-text">📰</div></div>
            <div class="news-card news-card-empty"><div class="news-card-empty-text">📰</div></div>
          </div>
          <div class="community-bottom-row">
            <div class="community-featured-post news-card-empty">
              <div class="featured-post-overlay" style="justify-content:center;align-items:center;">
                <div class="news-empty-message">Скоро здесь появятся новости 🔜</div>
              </div>
            </div>
            <div class="community-welcome">
              <h2>Добро пожаловать!</h2>
              <p><span class="welcome-username">${userName}</span>, мы рады тебя видеть в нашем сообществе!</p>
            </div>
          </div>`;
        return;
      }

      // Separate posts: those with banner images for carousel, rest for grid
      const getPostImage = (p) => {
        if (p.image) return p.image.startsWith('Rectangle') ? 'assets/backgrounds/banners/' + p.image : '/uploads/' + p.image;
        return '';
      };
      const featuredPosts = news.filter(p => p.image);
      const gridPosts = news.filter(p => !p.image).slice(0, 3);
      if (gridPosts.length === 0 && news.length > 1) {
        gridPosts.push(...news.filter(p => !featuredPosts.includes(p)).slice(0, 3));
      }

      // Grid news cards with optional news_image, likes and comments
      const newsHTML = gridPosts.map(post => {
        const cardImage = post.news_image ? `assets/photos/${post.news_image}` : '';
        const safeContent = (post.content || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        const safeTitle = (post.title || post.content.substring(0, 40)).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        return `
          <div class="news-card" data-news-title="${safeTitle}" data-news-content="${safeContent}" data-news-image="${cardImage}" data-news-likes="${post.likes_count || 0}" data-news-comments="${post.comments_count || 0}" data-post-id="${post.id}">
            <div class="news-card-title">${post.title || post.content.substring(0, 40)}</div>
            <div class="news-card-content">${post.content}</div>
            ${cardImage ? `<div class="news-card-image"><img src="${cardImage}" alt=""></div>` : ''}
            <div class="news-card-actions">
              <div class="post-action like-btn" data-post-id="${post.id}">
                <img src="assets/icons/nav/Лайк 1.png" alt="">
                <span class="like-count">${post.likes_count || 0}</span>
              </div>
              <div class="post-action comment-btn" data-post-id="${post.id}">
                <img src="assets/icons/nav/Комм.png" alt="">
                <span>${post.comments_count || 0}</span>
              </div>
            </div>
          </div>`;
      }).join('');

      // Featured posts carousel (multiple banners with navigation)
      const communityAvatar = this.current.avatar || this.current.icon || 'Admin.png';
      const avatarPath = 'assets/avatars/' + communityAvatar;
      let featuredHTML = '';
      if (featuredPosts.length > 0) {
        const slides = featuredPosts.map((post, i) => `
          <div class="featured-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
            <div class="community-featured-post" style="background-image: url('${getPostImage(post)}')">
              <div class="featured-post-overlay">
                <div>
                  <div class="featured-post-header">
                    <img src="${avatarPath}" alt="" class="featured-post-avatar">
                    <div>
                      <div class="featured-post-author">${this.current.title}</div>
                      <div class="featured-post-role">${post.author_role || 'Админ'}</div>
                    </div>
                  </div>
                  <div class="featured-post-text">${post.content}</div>
                </div>
                <div class="featured-post-actions">
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
          </div>`).join('');

        const navHTML = featuredPosts.length > 1 ? `
          <div class="featured-carousel-nav">
            <button class="carousel-btn featured-prev">‹</button>
            <button class="carousel-btn featured-next">›</button>
          </div>` : '';

        featuredHTML = `<div class="featured-carousel">${navHTML}<div class="featured-slides">${slides}</div></div>`;
      } else {
        featuredHTML = `<div class="community-featured-post news-card-empty">
          <div class="featured-post-overlay" style="justify-content:center;align-items:center;">
            <div class="news-empty-message">Скоро здесь появятся баннеры</div>
          </div>
        </div>`;
      }

      const welcomeHTML = `
        <div class="community-welcome">
          <h2>Добро пожаловать!</h2>
          <p><span class="welcome-username">${userName}</span>, мы рады тебя видеть в нашем сообществе!</p>
        </div>`;

      container.innerHTML = `
        <div class="news-grid">${newsHTML}</div>
        <div class="community-bottom-row">${featuredHTML}${welcomeHTML}</div>`;

      // Carousel logic
      if (featuredPosts.length > 1) {
        let currentSlide = 0;
        const slides = container.querySelectorAll('.featured-slide');
        const showSlide = (idx) => {
          slides.forEach(s => s.classList.remove('active'));
          currentSlide = (idx + slides.length) % slides.length;
          slides[currentSlide].classList.add('active');
        };
        container.querySelector('.featured-prev')?.addEventListener('click', () => showSlide(currentSlide - 1));
        container.querySelector('.featured-next')?.addEventListener('click', () => showSlide(currentSlide + 1));
      }

      container.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => Feed.toggleLike(btn));
      });
      container.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', () => Feed.openComments(btn.dataset.postId, btn));
      });

      gsap.fromTo(container.querySelectorAll('.news-card, .community-featured-post, .community-welcome'),
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08 });

      // Mobile: tap news card → open detail modal
      if (window.innerWidth <= 768) {
        container.querySelectorAll('.news-card[data-news-title]').forEach(card => {
          card.addEventListener('click', (e) => {
            // Don't open modal if clicking like/comment on desktop
            if (e.target.closest('.post-action')) return;
            this.openNewsModal(card);
          });
        });
      }
    } catch (e) { console.error(e); }
  },

  openNewsModal(card) {
    // Remove existing modal
    document.querySelector('.news-detail-modal')?.remove();

    const title = card.dataset.newsTitle;
    const content = card.dataset.newsContent;
    const image = card.dataset.newsImage;
    const likes = card.dataset.newsLikes;
    const comments = card.dataset.newsComments;
    const postId = card.dataset.postId;

    const modal = document.createElement('div');
    modal.className = 'news-detail-modal';
    modal.innerHTML = `
      <div class="news-modal-sheet">
        <div class="news-modal-handle"></div>
        ${image ? `<img src="${image}" class="news-modal-image" alt="">` : ''}
        <div class="news-modal-body">
          <div class="news-modal-title">${title}</div>
          <div class="news-modal-content">${content}</div>
          <div class="news-modal-actions">
            <div class="post-action like-btn" data-post-id="${postId}">
              <img src="assets/icons/nav/Лайк 1.png" alt="">
              <span class="like-count">${likes}</span>
            </div>
            <div class="post-action comment-btn" data-post-id="${postId}">
              <img src="assets/icons/nav/Комм.png" alt="">
              <span>${comments}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Like/comment handlers inside modal
    modal.querySelector('.like-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      Feed.toggleLike(modal.querySelector('.like-btn'));
    });
    modal.querySelector('.comment-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      Feed.openComments(postId, modal.querySelector('.comment-btn'));
    });

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => modal.classList.add('active'));
    });

    // Close on backdrop tap
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
      }
    });

    // Swipe down to close
    let startY = 0;
    const sheet = modal.querySelector('.news-modal-sheet');
    sheet.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });
    sheet.addEventListener('touchmove', (e) => {
      const diff = e.touches[0].clientY - startY;
      if (diff > 0) {
        sheet.style.transform = `translateY(${diff}px)`;
      }
    }, { passive: true });
    sheet.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientY - startY;
      if (diff > 100) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
      } else {
        sheet.style.transform = '';
      }
    });
  },

  pendingFiles: [],

  async loadChat() {
    if (!this.current || !Auth.isLoggedIn()) return;
    const container = document.getElementById('community-chat-messages');
    this.pendingFiles = [];
    document.getElementById('community-file-preview').style.display = 'none';
    document.getElementById('community-file-preview').innerHTML = '';

    try {
      const messages = await API.get(`/messages/community/${this.current.id}`);
      container.innerHTML = messages.map(m => this.renderChatMessage(m)).join('');
      container.scrollTop = container.scrollHeight;

      // Join socket room
      if (window.socketIO) {
        window.socketIO.emit('community:join', this.current.id);
      }
    } catch (e) { console.error(e); }

    // Send handler
    const sendBtn = document.getElementById('community-chat-send');
    const input = document.getElementById('community-chat-input');

    sendBtn.onclick = () => this.sendCommunityMessage();
    input.onkeypress = (e) => { if (e.key === 'Enter') this.sendCommunityMessage(); };

    // Photo/file upload handler
    const photoBtn = document.getElementById('community-photo-btn');
    const fileInput = document.getElementById('community-file-input');

    photoBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => this.handleFileSelect(fileInput);
  },

  handleFileSelect(fileInput) {
    const files = Array.from(fileInput.files);
    if (!files.length) return;

    // Filter out video files
    const allowed = files.filter(f => !f.type.startsWith('video/'));
    if (allowed.length < files.length) {
      showToast('Видео файлы не разрешены');
    }

    this.pendingFiles = [...this.pendingFiles, ...allowed];
    this.renderFilePreview();
    fileInput.value = '';
  },

  renderFilePreview() {
    const preview = document.getElementById('community-file-preview');
    if (this.pendingFiles.length === 0) {
      preview.style.display = 'none';
      preview.innerHTML = '';
      return;
    }
    preview.style.display = 'flex';
    preview.innerHTML = this.pendingFiles.map((file, i) => {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const url = URL.createObjectURL(file);
        return `<div class="file-preview-item" data-index="${i}">
          <img src="${url}" alt="${file.name}">
          <button class="file-preview-remove" onclick="Communities.removeFile(${i})">&times;</button>
        </div>`;
      } else {
        return `<div class="file-preview-item file-doc" data-index="${i}">
          <span class="file-doc-name">${file.name}</span>
          <button class="file-preview-remove" onclick="Communities.removeFile(${i})">&times;</button>
        </div>`;
      }
    }).join('');
  },

  removeFile(index) {
    this.pendingFiles.splice(index, 1);
    this.renderFilePreview();
  },

  async sendCommunityMessage() {
    const input = document.getElementById('community-chat-input');
    const text = input.value.trim();
    if (!text && this.pendingFiles.length === 0) return;
    if (!this.current) return;

    // Upload files if any
    let uploadedFiles = [];
    if (this.pendingFiles.length > 0) {
      try {
        const formData = new FormData();
        this.pendingFiles.forEach(f => formData.append('files', f));
        const resp = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || 'Upload failed');
        uploadedFiles = result;
        this.pendingFiles = [];
        this.renderFilePreview();
      } catch (e) {
        showToast(e.message || 'Ошибка загрузки файлов');
        return;
      }
    }

    // Send text message
    if (text && window.socketIO) {
      window.socketIO.emit('community:message', {
        communityId: this.current.id,
        text
      });
    }

    // Send file messages
    if (uploadedFiles.length > 0 && window.socketIO) {
      uploadedFiles.forEach(file => {
        window.socketIO.emit('community:message', {
          communityId: this.current.id,
          text: file.originalname,
          image: file.url
        });
      });
    }

    input.value = '';
  },

  renderChatMessage(msg) {
    const isOwn = msg.sender_id === Auth.user?.id;
    const isImage = msg.image && (/\.(jpg|jpeg|png|gif|webp|bmp)/i.test(msg.image) || msg.image.includes('cloudinary.com') || msg.image.includes('/uploads/'));
    const isFile = msg.image && !isImage;

    let attachmentHTML = '';
    if (isImage) {
      attachmentHTML = `<div class="chat-msg-image"><img src="${msg.image}" alt="${msg.text}"></div>`;
    } else if (isFile) {
      attachmentHTML = `<div class="chat-msg-file"><a href="${msg.image}" target="_blank" download>📎 ${msg.text}</a></div>`;
    }

    return `
      <div class="chat-message ${isOwn ? 'own' : ''}">
        <img src="assets/avatars/${msg.sender_avatar || 'Admin.png'}" alt="" class="chat-msg-avatar">
        <div class="chat-msg-bubble">
          ${!isOwn ? `<div class="chat-msg-name">${msg.sender_name}</div>` : ''}
          ${attachmentHTML}
          ${!isFile ? `<div class="chat-msg-text">${msg.text}</div>` : ''}
          <div class="chat-msg-time">${formatTime(msg.created_at)}</div>
        </div>
      </div>
    `;
  },

  appendCommunityMessage(msg) {
    const container = document.getElementById('community-chat-messages');
    container.insertAdjacentHTML('beforeend', this.renderChatMessage(msg));
    const newMsg = container.lastElementChild;
    gsap.fromTo(newMsg, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
    container.scrollTop = container.scrollHeight;
  },

  async loadGallery() {
    if (!this.current) return;
    const container = document.getElementById('community-gallery');

    // Hardcoded fallback for original communities
    const galleryMap = {
      sports: ['Group 3.png', 'image 5.png', 'image 4.png', 'image 6.png', 'image 7.png', 'image 8.png'],
      mobilography: ['342423 3.png', 'image58765 4.png', 'imag70079e 5.png', 'image 787896.png', 'imag87098e 7.png', 'image78098987 8.png'],
      volunteers: ['Gr987876oup 3.png', 'imag970978e 4.png', 'image 0898095.png', 'ima8890ge 6.png', 'image 89070977.png', 'imag98079e 8.png']
    };

    // Start with hardcoded photos for original communities
    let photos = [];
    if (galleryMap[this.current.slug]) {
      photos = galleryMap[this.current.slug].map(p => ({ src: `assets/photos/${p}`, id: null }));
    }

    // Add API-uploaded photos on top (newest first)
    try {
      const apiGallery = await API.get(`/communities/${this.current.slug}/gallery`);
      if (apiGallery && apiGallery.length > 0) {
        const apiPhotos = apiGallery.map(g => ({ src: `assets/photos/${g.image}`, id: g.id }));
        photos = [...apiPhotos, ...photos];
      }
    } catch (e) {}

    if (photos.length === 0) {
      container.innerHTML = '<div class="gallery-empty">Тут будут отображаться фото этого сообщества 📷</div>';
      return;
    }

    container.innerHTML = `<div class="gallery-grid">
      ${photos.map(p => `
        <div class="gallery-item">
          <img src="${p.src}" alt="" loading="lazy">
        </div>
      `).join('')}
    </div>`;

    // Lightbox
    container.querySelectorAll('.gallery-item img').forEach(img => {
      img.addEventListener('click', () => {
        const lightbox = document.getElementById('chat-lightbox');
        document.getElementById('lightbox-img').src = img.src;
        lightbox.style.display = 'flex';
        gsap.fromTo(lightbox, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      });
    });

    gsap.fromTo(container.querySelectorAll('.gallery-item'), { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.4, stagger: 0.06 });
  }
};

// Lightbox — shared init (close + download)
document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('chat-lightbox');
  if (!lightbox) return;

  function closeLightbox() {
    gsap.to(lightbox, { opacity: 0, duration: 0.2, onComplete: () => {
      lightbox.style.display = 'none';
    }});
  }

  // Close on backdrop
  lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);

  // Close on X button
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.style.display !== 'none') closeLightbox();
  });

  // Download button
  lightbox.querySelector('.lightbox-download').addEventListener('click', () => {
    const src = document.getElementById('lightbox-img').src;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = 'image_' + Date.now() + '.png';
    a.click();
  });

  // Open lightbox on chat image click (delegated — works for community & personal chat)
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.chat-msg-image img');
    if (img) {
      const lightboxImg = document.getElementById('lightbox-img');
      lightboxImg.src = img.src;
      lightbox.style.display = 'flex';
      gsap.fromTo(lightbox, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      gsap.fromTo(lightbox.querySelector('.lightbox-content'),
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' });
    }
  });
});
