// Chat Page
const Chat = {
  currentContact: null,
  typingTimeout: null,
  renderedMsgIds: new Set(),

  async load() {
    if (!Auth.isLoggedIn()) return;
    this.loadContacts();
    this.initPhotoButton();
    this.initLightbox();
    this.initContactSearch();
  },

  initContactSearch() {
    const input = document.querySelector('.contacts-search-input');
    if (!input || input.dataset.bound) return;
    input.dataset.bound = 'true';

    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      const contacts = document.querySelectorAll('#contacts-list .contact-item');
      contacts.forEach(c => {
        const name = c.querySelector('.contact-name')?.textContent.toLowerCase() || '';
        const msg = c.querySelector('.contact-last-msg')?.textContent.toLowerCase() || '';
        c.style.display = (name.includes(query) || msg.includes(query)) ? '' : 'none';
      });
    });
  },

  async loadContacts() {
    try {
      const contacts = await API.get('/messages/contacts');
      const list = document.getElementById('contacts-list');

      list.innerHTML = contacts.map(c => `
        <div class="contact-item" data-user-id="${c.id}">
          <div class="contact-avatar-wrapper">
            <img src="assets/avatars/${c.avatar || 'Admin.png'}" alt="" class="contact-avatar">
            ${c.is_online ? '<span class="contact-online-dot"></span>' : ''}
          </div>
          <div class="contact-info">
            <div class="contact-name">${c.name}</div>
            <div class="contact-last-msg">${c.last_message || 'Начните общение'}</div>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', () => {
          list.querySelectorAll('.contact-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          this.openChat(parseInt(item.dataset.userId), item);
        });
      });
    } catch (e) { console.error(e); }
  },

  async openChat(userId, contactEl) {
    this.currentContact = userId;
    const header = document.getElementById('chat-window-header');
    const name = contactEl.querySelector('.contact-name').textContent;
    const avatar = contactEl.querySelector('.contact-avatar').src;
    const isOnline = !!contactEl.querySelector('.contact-online-dot');

    header.innerHTML = `
      <img src="${avatar}" alt="" class="chat-header-avatar">
      <div>
        <div class="chat-header-name">${name}</div>
        <div class="chat-header-status" style="color:${isOnline ? 'var(--online-color)' : 'var(--text-muted)'}">
          ${isOnline ? 'онлайн' : 'оффлайн'}
        </div>
      </div>
    `;

    document.getElementById('personal-chat-input-bar').style.display = 'flex';

    try {
      const messages = await API.get(`/messages/user/${userId}`);
      this.renderedMsgIds = new Set(messages.map(m => m.id));
      const container = document.getElementById('personal-chat-messages');
      container.innerHTML = messages.map(m => this.renderMessage(m)).join('');
      container.scrollTop = container.scrollHeight;
    } catch (e) { console.error(e); }

    // Send handlers
    const sendBtn = document.getElementById('personal-chat-send');
    const input = document.getElementById('personal-chat-input');

    sendBtn.onclick = () => this.sendMessage();
    input.onkeypress = (e) => {
      if (e.key === 'Enter') this.sendMessage();
    };

    // Typing indicator
    input.oninput = () => {
      if (window.socketIO) {
        window.socketIO.emit('typing:start', { receiverId: userId });
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
          window.socketIO.emit('typing:stop', { receiverId: userId });
        }, 2000);
      }
    };
  },

  async openChatById(userId) {
    this.currentContact = userId;
    try {
      const userInfo = await API.get(`/users/profile/${userId}`);
      const header = document.getElementById('chat-window-header');
      header.innerHTML = `
        <img src="assets/avatars/${userInfo.avatar || 'Admin.png'}" alt="" class="chat-header-avatar">
        <div>
          <div class="chat-header-name">${userInfo.name}</div>
          <div class="chat-header-status" style="color:${userInfo.is_online ? 'var(--online-color)' : 'var(--text-muted)'}">
            ${userInfo.is_online ? 'онлайн' : 'оффлайн'}
          </div>
        </div>
      `;
      document.getElementById('personal-chat-input-bar').style.display = 'flex';

      const messages = await API.get(`/messages/user/${userId}`);
      this.renderedMsgIds = new Set(messages.map(m => m.id));
      const container = document.getElementById('personal-chat-messages');
      container.innerHTML = messages.map(m => this.renderMessage(m)).join('');
      container.scrollTop = container.scrollHeight;

      const sendBtn = document.getElementById('personal-chat-send');
      const input = document.getElementById('personal-chat-input');
      sendBtn.onclick = () => this.sendMessage();
      input.onkeypress = (e) => { if (e.key === 'Enter') this.sendMessage(); };
      input.oninput = () => {
        if (window.socketIO) {
          window.socketIO.emit('typing:start', { receiverId: userId });
          clearTimeout(this.typingTimeout);
          this.typingTimeout = setTimeout(() => {
            window.socketIO.emit('typing:stop', { receiverId: userId });
          }, 2000);
        }
      };
    } catch (e) { console.error(e); }
  },

  sendMessage() {
    const input = document.getElementById('personal-chat-input');
    const text = input.value.trim();
    if (!text || !this.currentContact) return;

    if (window.socketIO) {
      window.socketIO.emit('message:send', {
        receiverId: this.currentContact,
        text
      });
    }
    input.value = '';
  },

  renderMessage(msg) {
    const isOwn = msg.sender_id === Auth.user?.id;
    const isImage = msg.image && (/\.(jpg|jpeg|png|gif|webp|bmp)/i.test(msg.image) || msg.image.includes('cloudinary.com') || msg.image.includes('/uploads/'));
    let contentHTML = '';
    if (isImage) {
      contentHTML = `<div class="chat-msg-image"><img src="${msg.image}" alt="${msg.text || 'фото'}" style="max-width:250px;border-radius:8px;"></div>`;
    } else if (msg.image) {
      contentHTML = `<div class="chat-msg-file"><a href="${msg.image}" target="_blank" download>📎 ${msg.text}</a></div>`;
    } else {
      contentHTML = `<div class="chat-msg-text">${msg.text}</div>`;
    }
    return `
      <div class="chat-message ${isOwn ? 'own' : ''}">
        <img src="assets/avatars/${msg.sender_avatar || 'Admin.png'}" alt="" class="chat-msg-avatar">
        <div class="chat-msg-bubble">
          ${contentHTML}
          <div class="chat-msg-time">${formatTime(msg.created_at)}</div>
        </div>
      </div>
    `;
  },

  appendMessage(msg) {
    // Prevent duplicate messages
    if (msg.id && this.renderedMsgIds.has(msg.id)) return;
    if (msg.id) this.renderedMsgIds.add(msg.id);

    const container = document.getElementById('personal-chat-messages');
    container.insertAdjacentHTML('beforeend', this.renderMessage(msg));
    const newMsg = container.lastElementChild;
    gsap.fromTo(newMsg, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
    container.scrollTop = container.scrollHeight;
  },

  showTyping(userId) {
    const container = document.getElementById('personal-chat-messages');
    let indicator = container.querySelector('.typing-indicator');
    if (!indicator) {
      container.insertAdjacentHTML('beforeend', '<div class="typing-indicator">печатает...</div>');
    }
    container.scrollTop = container.scrollHeight;
  },

  hideTyping() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
  },

  initLightbox() {
    const lightbox = document.getElementById('chat-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    if (!lightbox) return;

    // Close on backdrop click
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', () => this.closeLightbox());
    // Close on X button
    lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.style.display !== 'none') this.closeLightbox();
    });
    // Download button
    lightbox.querySelector('.lightbox-download').addEventListener('click', () => {
      const src = lightboxImg.src;
      const a = document.createElement('a');
      a.href = src;
      a.download = 'image_' + Date.now() + '.png';
      a.click();
    });

    // Delegate click on chat images
    document.addEventListener('click', (e) => {
      const img = e.target.closest('.chat-msg-image img');
      if (img) {
        this.openLightbox(img.src);
      }
    });
  },

  openLightbox(src) {
    const lightbox = document.getElementById('chat-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    lightboxImg.src = src;
    lightbox.style.display = 'flex';
    gsap.fromTo(lightbox, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(lightbox.querySelector('.lightbox-content'),
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.5)' }
    );
  },

  closeLightbox() {
    const lightbox = document.getElementById('chat-lightbox');
    gsap.to(lightbox, {
      opacity: 0, duration: 0.2,
      onComplete: () => { lightbox.style.display = 'none'; }
    });
  },

  initPhotoButton() {
    const photoBtn = document.getElementById('chat-photo-btn');
    const fileInput = document.getElementById('chat-file-input');
    if (!photoBtn || !fileInput) return;

    photoBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || !this.currentContact) return;
      fileInput.value = '';

      try {
        const formData = new FormData();
        formData.append('files', file);
        const resp = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || 'Upload failed');

        const uploaded = result[0];
        if (window.socketIO) {
          window.socketIO.emit('message:send', {
            receiverId: this.currentContact,
            text: uploaded.originalname,
            image: uploaded.url
          });
        }
      } catch (err) {
        showToast(err.message || 'Ошибка загрузки фото');
      }
    });
  }
};
