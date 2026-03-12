// Main Application
(async function() {
  // Initialize theme
  ThemeManager.init();

  // Initialize auth
  Auth.init();

  // Initialize router
  Router.init();

  // Initialize friends
  Friends.init();

  // Initialize mobile
  if (typeof Mobile !== 'undefined') Mobile.init();

  // Check if already logged in
  const isLoggedIn = await Auth.checkAuth();

  if (!isLoggedIn) {
    // Show auth page by default
    Auth.showAuthPage();
  } else {
    Auth.showApp();
    Auth.updateUI();
    Router.navigate('feed');
  }

  // Initialize Socket.io
  initSocket();

  // Notifications
  initNotifications();
})();

// Socket.io initialization
function initSocket() {
  try {
    window.socketIO = io(window.location.origin, {
      withCredentials: true
    });

    window.socketIO.on('connect', () => {
      console.log('Socket connected');
    });

    // Personal message received
    window.socketIO.on('message:receive', (msg) => {
      if (Chat.currentContact === msg.sender_id) {
        Chat.appendMessage(msg);
      }
      // Update contacts list
      Chat.loadContacts();
    });

    // Own message sent confirmation
    window.socketIO.on('message:sent', (msg) => {
      Chat.appendMessage(msg);
    });

    // Community message
    window.socketIO.on('community:message', (msg) => {
      Communities.appendCommunityMessage(msg);
    });

    // Typing indicators
    window.socketIO.on('typing:start', (data) => {
      if (Chat.currentContact === data.userId) {
        Chat.showTyping(data.userId);
      }
    });

    window.socketIO.on('typing:stop', (data) => {
      Chat.hideTyping();
    });

    // Online status
    window.socketIO.on('user:online', (data) => {
      updateOnlineStatus(data.userId, true);
    });

    window.socketIO.on('user:offline', (data) => {
      updateOnlineStatus(data.userId, false);
    });

    // Real-time notification
    window.socketIO.on('notification:new', (notif) => {
      const dot = document.querySelector('.notification-dot');
      if (dot) dot.style.display = 'block';
    });
  } catch (e) {
    console.log('Socket.io not available - running in static mode');
  }
}

function updateOnlineStatus(userId, isOnline) {
  const contactItem = document.querySelector(`.contact-item[data-user-id="${userId}"]`);
  if (contactItem) {
    const wrapper = contactItem.querySelector('.contact-avatar-wrapper');
    const dot = wrapper.querySelector('.contact-online-dot');
    if (isOnline && !dot) {
      wrapper.insertAdjacentHTML('beforeend', '<span class="contact-online-dot"></span>');
    } else if (!isOnline && dot) {
      dot.remove();
    }
  }
}

// Notifications
function initNotifications() {
  const btn = document.getElementById('notifications-btn');
  const dropdown = document.getElementById('notifications-dropdown');

  btn.addEventListener('click', async () => {
    const isVisible = dropdown.style.display !== 'none';
    if (isVisible) {
      dropdown.style.display = 'none';
      return;
    }

    dropdown.style.display = 'block';
    document.querySelector('.notification-dot').style.display = 'none';

    if (Auth.isLoggedIn()) {
      try {
        const notifications = await API.get('/notifications');
        const list = dropdown.querySelector('.notifications-list');
        if (notifications.length === 0) {
          list.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon">🔔</div>Нет уведомлений</div>';
        } else {
          list.innerHTML = notifications.map(n => `
            <div class="notif-item">
              <div class="notif-icon">🔔</div>
              <div class="notif-content">
                <div class="notif-text">${n.text}</div>
                <div class="notif-time">${formatTime(n.created_at)}</div>
              </div>
            </div>
          `).join('');
        }
        await API.put('/notifications/read', {});
      } catch (e) {}
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Check unread count periodically
  if (Auth.isLoggedIn()) {
    checkUnread();
    setInterval(checkUnread, 30000);
  }
}

async function checkUnread() {
  if (!Auth.isLoggedIn()) return;
  try {
    const data = await API.get('/notifications/unread');
    const dot = document.querySelector('.notification-dot');
    dot.style.display = data.count > 0 ? 'block' : 'none';
  } catch (e) {}
}
