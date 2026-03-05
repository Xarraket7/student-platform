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
    return `
      <div class="chat-message ${isOwn ? 'own' : ''}">
        <img src="assets/avatars/${msg.sender_avatar || 'Admin.png'}" alt="" class="chat-msg-avatar">
        <div class="chat-msg-bubble">
          <div class="chat-msg-text">${msg.text}</div>
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

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file || !this.currentContact) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const imgSrc = event.target.result;
        // Show image preview in chat as own message
        const container = document.getElementById('personal-chat-messages');
        const msgHtml = `
          <div class="chat-message own">
            <img src="assets/avatars/${Auth.user?.avatar || 'Admin.png'}" alt="" class="chat-msg-avatar">
            <div class="chat-msg-bubble">
              <div class="chat-msg-image"><img src="${imgSrc}" alt="фото" style="max-width:250px;border-radius:8px;"></div>
              <div class="chat-msg-time">${new Date().toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'})}</div>
            </div>
          </div>
        `;
        container.insertAdjacentHTML('beforeend', msgHtml);
        const newMsg = container.lastElementChild;
        gsap.fromTo(newMsg, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });
        container.scrollTop = container.scrollHeight;
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });
  }
};
