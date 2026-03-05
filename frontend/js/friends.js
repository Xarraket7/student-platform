// Friends Module
const Friends = {
  friendsList: [],
  currentTab: 'friends',
  popup: null,

  // ---- Friends Online (feed sidebar) ----
  async loadOnlineFriends() {
    const container = document.getElementById('feed-friends-online');
    if (!container) return;

    if (!Auth.isLoggedIn()) {
      try {
        const online = await API.get('/users/online');
        this.renderFriendsOnline(container, online);
      } catch (e) { console.error(e); }
      return;
    }

    try {
      const onlineFriends = await API.get('/friends/online');
      if (onlineFriends.length === 0) {
        container.innerHTML = '<span style="font-size:12px;font-family:var(--font-small);color:var(--text-muted);">Нет друзей онлайн</span>';
        return;
      }
      this.renderFriendsOnline(container, onlineFriends);
    } catch (e) {
      try {
        const online = await API.get('/users/online');
        this.renderFriendsOnline(container, online);
      } catch (e2) { console.error(e2); }
    }
  },

  renderFriendsOnline(container, users) {
    container.innerHTML = users.map(u => `
      <div class="friend-item" data-user-id="${u.id}" title="${u.name}">
        <div class="friend-avatar-wrap">
          <img src="assets/avatars/${u.avatar || 'Admin.png'}" alt="${u.name}">
          <div class="friend-online-dot"></div>
        </div>
        <span class="friend-name">${u.name.split(' ')[0]}</span>
      </div>
    `).join('');

    container.querySelectorAll('.friend-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const userId = parseInt(item.dataset.userId);
        this.showPopup(item, userId);
      });
    });

    gsap.fromTo(container.children,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.3, stagger: 0.05, ease: 'back.out(1.5)' }
    );
  },

  // ---- Friend Avatar Popup ----
  showPopup(anchorEl, userId) {
    this.closePopup();

    const rect = anchorEl.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'friend-popup';
    popup.innerHTML = `
      <div class="friend-popup-action" data-action="message">
        <img src="assets/icons/nav/Чат, Общий чат.png" alt="">
        <span>Написать сообщение</span>
      </div>
      <div class="friend-popup-action" data-action="profile">
        <img src="assets/icons/nav/Лента, Галерея.png" alt="">
        <span>Посмотреть профиль</span>
      </div>
    `;

    document.body.appendChild(popup);
    this.popup = popup;

    // Position above avatar (account for CSS zoom)
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const popupRect = popup.getBoundingClientRect();
    const anchorLeft = rect.left / zoom;
    const anchorTop = rect.top / zoom;
    const anchorWidth = rect.width / zoom;
    const anchorBottom = rect.bottom / zoom;
    const popupW = popupRect.width / zoom;
    const popupH = popupRect.height / zoom;

    let left = anchorLeft + anchorWidth / 2 - popupW / 2;
    let top = anchorTop - popupH - 8;

    if (top < 10) top = anchorBottom + 8;
    if (left < 10) left = 10;
    if (left + popupW > window.innerWidth / zoom - 10) {
      left = window.innerWidth / zoom - popupW - 10;
    }

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';

    gsap.fromTo(popup,
      { opacity: 0, scale: 0.9, y: 5 },
      { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'back.out(2)' }
    );

    popup.querySelector('[data-action="message"]').addEventListener('click', () => {
      this.closePopup();
      Router.navigate('chat');
      setTimeout(() => Chat.openChatById(userId), 500);
    });

    popup.querySelector('[data-action="profile"]').addEventListener('click', () => {
      this.closePopup();
      Profile.loadUserProfile(userId);
    });

    setTimeout(() => {
      const closeHandler = (e) => {
        if (!popup.contains(e.target) && !anchorEl.contains(e.target)) {
          this.closePopup();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 10);
  },

  closePopup() {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
  },

  // ---- Friends Modal ----
  async openModal() {
    if (!Auth.isLoggedIn()) {
      showToast('Войдите, чтобы управлять друзьями');
      return;
    }

    const modal = document.getElementById('friends-modal');
    if (modal.style.display === 'block') {
      this.closeModal();
      return;
    }
    modal.style.display = 'block';
    gsap.fromTo('.friends-modal',
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
    );

    this.currentTab = 'friends';
    this.updateModalTabs();
    await this.loadModalContent();
  },

  closeModal() {
    gsap.to('.friends-modal', {
      opacity: 0, y: 10, duration: 0.15,
      onComplete: () => {
        document.getElementById('friends-modal').style.display = 'none';
      }
    });
  },

  async loadModalContent() {
    const list = document.getElementById('friends-modal-list');
    list.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;font-size:13px;">Загрузка...</p>';

    try {
      if (this.currentTab === 'friends') {
        const friends = await API.get('/friends');
        this.friendsList = friends;
        this.renderModalList(friends, true);
      } else {
        const allUsers = await API.get('/users/all');
        const friends = await API.get('/friends');
        this.friendsList = friends;
        this.renderModalList(allUsers, false);
      }
    } catch (e) {
      list.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">Ошибка загрузки</p>';
    }
  },

  renderModalList(users, isFriendsTab) {
    const list = document.getElementById('friends-modal-list');
    const friendIds = this.friendsList.map(f => f.id);
    const filtered = users.filter(u => u.id !== Auth.user?.id);

    if (filtered.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:rgba(255,255,255,0.4);padding:30px;font-size:13px;font-family:var(--font-small);">
        ${isFriendsTab ? 'У вас пока нет друзей' : 'Пользователи не найдены'}
      </p>`;
      return;
    }

    list.innerHTML = filtered.map(u => {
      const isFriend = friendIds.includes(u.id);
      const isOnline = u.is_online;
      return `
        <div class="friends-modal-item" data-user-id="${u.id}">
          <div class="friends-modal-avatar-wrap">
            <img src="assets/avatars/${u.avatar || 'Admin.png'}" alt="${u.name}">
            <div class="${isOnline ? 'online-dot' : 'offline-dot'}"></div>
          </div>
          <div class="friends-modal-info">
            <div class="friends-modal-name">${u.name}</div>
            <div class="friends-modal-status ${isOnline ? 'online' : ''}">
              ${isOnline ? 'онлайн' : 'оффлайн'}${u.group_name ? ' · ' + u.group_name : ''}
            </div>
          </div>
          <button class="friends-modal-action ${isFriend ? 'remove-btn' : 'add-btn'}"
                  data-user-id="${u.id}" data-is-friend="${isFriend}">
            ${isFriend ? 'Удалить' : 'Добавить'}
          </button>
        </div>
      `;
    }).join('');

    // Click on item row -> visit profile
    list.querySelectorAll('.friends-modal-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.friends-modal-action')) return;
        const userId = parseInt(item.dataset.userId);
        this.closeModal();
        Profile.loadUserProfile(userId);
      });
    });

    // Add/remove friend buttons
    list.querySelectorAll('.friends-modal-action').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const userId = parseInt(btn.dataset.userId);
        const isFriend = btn.dataset.isFriend === 'true';
        try {
          if (isFriend) {
            await API.post('/friends/remove', { userId });
            showToast('Друг удален');
          } else {
            await API.post('/friends/add', { userId });
            showToast('Друг добавлен');
          }
          await this.loadModalContent();
          this.loadOnlineFriends();
        } catch (err) { showToast(err.message || 'Ошибка'); }
      });
    });

    gsap.fromTo(list.children,
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.25, stagger: 0.03, ease: 'power2.out' }
    );
  },

  updateModalTabs() {
    document.querySelectorAll('.friends-modal-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === this.currentTab);
    });
  },

  filterModalList(query) {
    const items = document.querySelectorAll('.friends-modal-item');
    const q = query.toLowerCase();
    items.forEach(item => {
      const name = item.querySelector('.friends-modal-name').textContent.toLowerCase();
      item.style.display = name.includes(q) ? 'flex' : 'none';
    });
  },

  // ---- Init ----
  init() {
    const arrow = document.querySelector('.friends-arrow');
    if (arrow) arrow.addEventListener('click', () => this.openModal());

    document.getElementById('close-friends')?.addEventListener('click', () => this.closeModal());

    document.getElementById('friends-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'friends-modal') this.closeModal();
    });

    document.querySelectorAll('.friends-modal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentTab = tab.dataset.tab;
        this.updateModalTabs();
        this.loadModalContent();
      });
    });

    document.getElementById('friends-search-input')?.addEventListener('input', (e) => {
      this.filterModalList(e.target.value);
    });
  }
};
