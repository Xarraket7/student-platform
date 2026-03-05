// Admin Page
const Admin = {
  async load() {
    if (!Auth.isAdmin()) return;

    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.admin-section').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
        const target = document.getElementById(`admin-${tab.dataset.adminTab}`);
        target.classList.add('active');
        target.style.display = 'block';
      };
    });

    this.loadPostsSection();
    this.loadCommunitiesSection();
    this.loadAnnouncementsSection();
    this.loadGallerySection();
    this.loadEventsSection();
    this.loadUsersSection();
  },

  async loadPostsSection() {
    // Populate community select
    try {
      const communities = await API.get('/communities');
      const select = document.getElementById('admin-post-community');
      select.innerHTML = '<option value="">Выберите сообщество</option>' +
        communities.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
    } catch (e) {}

    // Form handler
    document.getElementById('admin-post-form').onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('admin-post-title').value;
      const content = document.getElementById('admin-post-content').value;
      const community_id = document.getElementById('admin-post-community').value;
      const visibility = document.getElementById('admin-post-visibility').value;
      const imageFile = document.getElementById('admin-post-image').files[0];
      const newsImageFile = document.getElementById('admin-post-news-image').files[0];

      if (!content) return showToast('Введите текст поста');

      const formData = new FormData();
      if (title) formData.append('title', title);
      formData.append('content', content);
      if (community_id) formData.append('community_id', community_id);
      formData.append('visibility', visibility);
      if (imageFile) formData.append('image', imageFile);
      if (newsImageFile) formData.append('news_image', newsImageFile);

      try {
        await API.upload('/posts', formData);
        showToast('Пост опубликован');
        document.getElementById('admin-post-form').reset();
        this.loadPostsList();
      } catch (e) { showToast(e.message); }
    };

    this.loadPostsList();
  },

  async loadPostsList() {
    try {
      const posts = await API.get('/posts/all');
      const list = document.getElementById('admin-posts-list');

      const visLabel = { feed: 'Лента', community: 'Сообщество', both: 'Везде' };

      list.innerHTML = posts.map(p => {
        const vis = p.visibility || (p.is_feed ? 'feed' : 'community');
        return `
        <div class="admin-list-item">
          <div class="admin-list-item-info">
            <div class="admin-list-item-title">${p.title || p.content?.substring(0, 50)}...</div>
            <div class="admin-list-item-meta">${p.community_title || 'Без сообщества'} • ${visLabel[vis] || vis} • ${formatTime(p.created_at)}</div>
          </div>
          <div class="admin-list-item-actions">
            <button class="admin-delete-btn" data-id="${p.id}" data-type="post">Удалить</button>
          </div>
        </div>`;
      }).join('');

      list.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.delete(`/posts/${btn.dataset.id}`);
            showToast('Пост удален');
            this.loadPostsList();
          } catch (e) { showToast(e.message); }
        });
      });
    } catch (e) {}
  },

  async loadCommunitiesSection() {
    document.getElementById('admin-community-form').onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('admin-comm-title').value;
      const slug = document.getElementById('admin-comm-slug').value;
      const desc = document.getElementById('admin-comm-desc').value;
      const iconFile = document.getElementById('admin-comm-icon').files[0];
      const bgFile = document.getElementById('admin-comm-bg').files[0];

      if (!title || !slug) return showToast('Заполните название и ссылку');

      const formData = new FormData();
      formData.append('title', title);
      formData.append('slug', slug);
      if (desc) formData.append('description', desc);
      if (iconFile) formData.append('icon', iconFile);
      if (bgFile) formData.append('background', bgFile);

      try {
        await API.upload('/communities', formData);
        showToast('Сообщество создано');
        document.getElementById('admin-community-form').reset();
        this.loadCommunitiesList();
      } catch (e) { showToast(e.message); }
    };

    // Edit modal handlers
    document.getElementById('community-edit-close').onclick = () => {
      document.getElementById('community-edit-modal').style.display = 'none';
    };
    document.getElementById('community-edit-modal').onclick = (e) => {
      if (e.target.id === 'community-edit-modal') e.target.style.display = 'none';
    };
    document.getElementById('community-edit-form').onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-comm-id').value;
      const formData = new FormData();
      formData.append('title', document.getElementById('edit-comm-title').value);
      formData.append('slug', document.getElementById('edit-comm-slug').value);
      formData.append('description', document.getElementById('edit-comm-desc').value);
      const iconFile = document.getElementById('edit-comm-icon').files[0];
      const bgFile = document.getElementById('edit-comm-bg').files[0];
      if (iconFile) formData.append('icon', iconFile);
      if (bgFile) formData.append('background', bgFile);

      try {
        await API.uploadPut(`/communities/${id}`, formData);
        showToast('Сообщество обновлено');
        document.getElementById('community-edit-modal').style.display = 'none';
        this.loadCommunitiesList();
      } catch (e) { showToast(e.message); }
    };

    this.loadCommunitiesList();
    this.setupSlugSuggestions();
  },

  async setupSlugSuggestions() {
    const input = document.getElementById('admin-comm-slug');
    const dropdown = document.getElementById('slug-suggestions');
    let communities = [];
    try { communities = await API.get('/communities'); } catch(e) {}

    input.addEventListener('input', () => {
      const val = input.value;
      if (val.includes('/') || val === '') {
        const filter = val.replace('/', '').toLowerCase();
        const matches = communities.filter(c =>
          c.slug.toLowerCase().includes(filter) || c.title.toLowerCase().includes(filter)
        );
        if (matches.length > 0) {
          dropdown.innerHTML = matches.map(c =>
            `<div class="slug-suggestion-item" data-slug="${c.slug}">
              <span class="slug-suggestion-name">${c.title}</span>
              <span class="slug-suggestion-path">/${c.slug}</span>
            </div>`
          ).join('');
          dropdown.style.display = 'block';
          dropdown.querySelectorAll('.slug-suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
              input.value = item.dataset.slug;
              dropdown.style.display = 'none';
            });
          });
        } else {
          dropdown.style.display = 'none';
        }
      } else {
        dropdown.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  },

  async loadCommunitiesList() {
    try {
      const communities = await API.get('/communities');
      const list = document.getElementById('admin-communities-list');
      list.innerHTML = communities.map(c => `
        <div class="admin-list-item">
          ${c.feed_icon ? `<img src="assets/icons/feed/${c.feed_icon}" class="admin-list-icon">` : ''}
          <div class="admin-list-item-info">
            <div class="admin-list-item-title">${c.title}</div>
            <div class="admin-list-item-meta">/${c.slug}${c.description ? ' — ' + c.description.substring(0, 50) + (c.description.length > 50 ? '...' : '') : ''}</div>
          </div>
          <div class="admin-list-item-actions">
            <button class="admin-edit-btn" data-id="${c.id}">Редактировать</button>
            <button class="admin-delete-btn" data-id="${c.id}">Удалить</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.admin-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => this.openEditCommunity(btn.dataset.id, communities));
      });

      list.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.delete(`/communities/${btn.dataset.id}`);
            showToast('Сообщество удалено');
            this.loadCommunitiesList();
          } catch (e) { showToast(e.message); }
        });
      });
    } catch (e) {}
  },

  openEditCommunity(id, communities) {
    const c = communities.find(x => x.id == id);
    if (!c) return;
    document.getElementById('edit-comm-id').value = c.id;
    document.getElementById('edit-comm-title').value = c.title || '';
    document.getElementById('edit-comm-slug').value = c.slug || '';
    document.getElementById('edit-comm-desc').value = c.description || '';
    document.getElementById('edit-comm-icon').value = '';
    document.getElementById('edit-comm-bg').value = '';

    const iconPreview = document.getElementById('edit-comm-icon-preview');
    const bgPreview = document.getElementById('edit-comm-bg-preview');
    iconPreview.src = c.feed_icon ? `assets/icons/feed/${c.feed_icon}` : '';
    iconPreview.style.display = c.feed_icon ? 'block' : 'none';
    bgPreview.src = c.background ? `assets/backgrounds/communities/${c.background}` : '';
    bgPreview.style.display = c.background ? 'block' : 'none';

    document.getElementById('community-edit-modal').style.display = 'flex';
  },

  async loadAnnouncementsSection() {
    document.getElementById('admin-announcement-form').onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('admin-ann-title').value;
      const description = document.getElementById('admin-ann-desc').value;
      const imageFile = document.getElementById('admin-ann-image').files[0];
      const bgFile = document.getElementById('admin-ann-bg').files[0];
      if (!title) return showToast('Введите заголовок');

      try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        if (imageFile) formData.append('image', imageFile);
        if (bgFile) formData.append('background', bgFile);

        await API.upload('/announcements', formData);
        showToast('Объявление добавлено');
        document.getElementById('admin-announcement-form').reset();
        this.loadAnnouncementsList();
      } catch (e) { showToast(e.message); }
    };

    this.loadAnnouncementsList();
  },

  async loadAnnouncementsList() {
    try {
      const announcements = await API.get('/announcements');
      const list = document.getElementById('admin-announcements-list');
      list.innerHTML = announcements.map(a => `
        <div class="admin-list-item">
          <div class="admin-list-item-info">
            <div class="admin-list-item-title">${a.title}</div>
            <div class="admin-list-item-meta">${a.description?.substring(0, 60)}...</div>
          </div>
          <div class="admin-list-item-actions">
            <button class="admin-delete-btn" data-id="${a.id}">Удалить</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.delete(`/announcements/${btn.dataset.id}`);
            showToast('Объявление удалено');
            this.loadAnnouncementsList();
          } catch (e) { showToast(e.message); }
        });
      });
    } catch (e) {}
  },

  async loadGallerySection() {
    // Populate community select
    try {
      const communities = await API.get('/communities');
      const select = document.getElementById('admin-gallery-community');
      select.innerHTML = '<option value="">Выберите сообщество</option>' +
        communities.map(c => `<option value="${c.slug}" data-id="${c.id}">${c.title}</option>`).join('');
    } catch (e) {}

    // Load gallery when community is selected
    document.getElementById('admin-gallery-community').onchange = () => {
      this.loadGalleryList();
    };

    // Form handler
    document.getElementById('admin-gallery-form').onsubmit = async (e) => {
      e.preventDefault();
      const slug = document.getElementById('admin-gallery-community').value;
      const files = document.getElementById('admin-gallery-files').files;

      if (!slug) return showToast('Выберите сообщество');
      if (!files.length) return showToast('Выберите фото');

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('photos', files[i]);
      }

      try {
        await API.upload(`/communities/${slug}/gallery`, formData);
        showToast('Фото загружены');
        document.getElementById('admin-gallery-files').value = '';
        this.loadGalleryList();
      } catch (e) { showToast(e.message); }
    };
  },

  async loadGalleryList() {
    const slug = document.getElementById('admin-gallery-community').value;
    const list = document.getElementById('admin-gallery-list');
    const preview = document.getElementById('admin-gallery-preview');

    if (!slug) {
      list.innerHTML = '';
      preview.innerHTML = '';
      return;
    }

    try {
      const gallery = await API.get(`/communities/${slug}/gallery`);
      if (gallery.length === 0) {
        preview.innerHTML = '<div style="padding:20px;text-align:center;color:rgba(255,255,255,0.4);font-size:13px;">Нет фото в галерее</div>';
        list.innerHTML = '';
        return;
      }

      preview.innerHTML = gallery.map(g => `
        <div class="admin-gallery-item">
          <img src="assets/photos/${g.image}" alt="">
          <button class="admin-gallery-delete" data-id="${g.id}" data-slug="${slug}">&times;</button>
        </div>
      `).join('');

      list.innerHTML = '';

      preview.querySelectorAll('.admin-gallery-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.delete(`/communities/${btn.dataset.slug}/gallery/${btn.dataset.id}`);
            showToast('Фото удалено');
            this.loadGalleryList();
          } catch (e) { showToast(e.message); }
        });
      });
    } catch (e) { console.error(e); }
  },

  async loadEventsSection() {
    // Icon picker logic
    const iconPicker = document.getElementById('event-icon-picker');
    const iconInput = document.getElementById('admin-event-icon');
    if (iconPicker) {
      iconPicker.querySelectorAll('.event-icon-option').forEach(opt => {
        opt.addEventListener('click', () => {
          iconPicker.querySelectorAll('.event-icon-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          iconInput.value = opt.dataset.icon;
        });
      });
    }

    document.getElementById('admin-event-form').onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('admin-event-title').value;
      const description = document.getElementById('admin-event-desc').value;
      const icon = document.getElementById('admin-event-icon').value;
      const event_date = document.getElementById('admin-event-date').value;
      const event_time = document.getElementById('admin-event-time').value;
      if (!title) return showToast('Введите название');

      try {
        await API.post('/events', { title, description, icon, event_date, event_time });
        showToast('Событие добавлено');
        document.getElementById('admin-event-title').value = '';
        document.getElementById('admin-event-desc').value = '';
        document.getElementById('admin-event-icon').value = '';
        iconPicker.querySelectorAll('.event-icon-option').forEach(o => o.classList.remove('selected'));
        this.loadEventsList();
      } catch (e) { showToast(e.message); }
    };

    this.loadEventsList();
  },

  async loadEventsList() {
    try {
      const events = await API.get('/events');
      const list = document.getElementById('admin-events-list');
      list.innerHTML = events.map(e => `
        <div class="admin-list-item">
          <div class="admin-list-item-info">
            <div class="admin-list-item-title">${e.title}</div>
            <div class="admin-list-item-meta">${e.event_date ? formatDate(e.event_date) : 'Без даты'}</div>
          </div>
          <div class="admin-list-item-actions">
            <button class="admin-delete-btn" data-id="${e.id}">Удалить</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.delete(`/events/${btn.dataset.id}`);
            showToast('Событие удалено');
            this.loadEventsList();
          } catch (e) { showToast(e.message); }
        });
      });
    } catch (e) {}
  },

  async loadUsersSection() {
    try {
      const users = await API.get('/users');
      const list = document.getElementById('admin-users-list');
      list.innerHTML = users.map(u => `
        <div class="admin-list-item">
          <div class="admin-list-item-info" style="display:flex;align-items:center;gap:14px">
            <img src="assets/avatars/${u.avatar || 'Admin.png'}" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">
            <div>
              <div class="admin-list-item-title" style="font-size:16px;font-weight:500">${u.name}</div>
              <div class="admin-list-item-meta" style="font-size:13px">${u.email || ''} • ${u.role}</div>
            </div>
          </div>
          <div class="admin-list-item-actions">
            <select class="admin-role-select" data-user-id="${u.id}">
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Админ</option>
              <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>Преподаватель</option>
              <option value="student" ${u.role === 'student' ? 'selected' : ''}>Студент</option>
            </select>
            <button class="admin-delete-btn" data-id="${u.id}">Удалить</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.admin-role-select').forEach(select => {
        select.addEventListener('change', async () => {
          try {
            await API.put(`/users/${select.dataset.userId}/role`, { role: select.value });
            showToast('Роль обновлена');
          } catch (e) { showToast(e.message); }
        });
      });

      list.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await API.delete(`/users/${btn.dataset.id}`);
            showToast('Пользователь удален');
            this.loadUsersSection();
          } catch (e) { showToast(e.message); }
        });
      });
    } catch (e) {}
  }
};
