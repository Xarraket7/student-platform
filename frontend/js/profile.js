// Profile Page
const Profile = {
  editing: false,
  viewingUserId: null,
  avatarFile: null,
  cropper: null,

  async load() {
    this.viewingUserId = null;
    if (!Auth.isLoggedIn()) return;

    // Restore own profile UI
    document.querySelector('.profile-back-btn')?.remove();
    document.querySelector('.profile-view-actions')?.remove();
    const editBtn = document.getElementById('profile-edit-btn');
    const saveBtn = document.getElementById('profile-save-btn');
    if (editBtn) editBtn.style.display = '';
    if (saveBtn) saveBtn.style.display = 'none';
    document.querySelectorAll('.profile-input').forEach(i => i.disabled = true);
    this.editing = false;

    try {
      const user = await API.get('/users/profile');
      document.getElementById('profile-avatar').src = `assets/avatars/${user.avatar || 'Admin.png'}`;
      document.getElementById('profile-name').textContent = user.name;
      document.getElementById('profile-role').textContent = user.role;
      document.getElementById('profile-group').textContent = user.group_name || '';

      document.getElementById('profile-edit-name').value = user.name || '';
      document.getElementById('profile-edit-email').value = user.email || '';
      document.getElementById('profile-edit-group').value = user.group_name || '';
      document.getElementById('profile-edit-age').value = user.age || '';
      document.getElementById('profile-edit-birthday').value = user.birthday?.substring(0, 10) || '';
    } catch (e) { console.error(e); }

    document.getElementById('profile-edit-btn').onclick = () => this.toggleEdit();
    document.getElementById('profile-save-btn').onclick = () => this.save();

    // Avatar upload handlers
    const avatarWrapper = document.getElementById('profile-avatar-wrapper');
    const avatarInput = document.getElementById('profile-avatar-input');
    avatarWrapper.classList.remove('editable');
    this.avatarFile = null;

    avatarWrapper.onclick = () => {
      if (this.editing) avatarInput.click();
    };
    avatarInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => this.openCropModal(ev.target.result);
      reader.readAsDataURL(file);
      avatarInput.value = '';
    };

    // Crop modal buttons
    document.getElementById('avatar-crop-save').onclick = () => this.saveCrop();
    document.getElementById('avatar-crop-cancel').onclick = () => this.closeCropModal();
    document.querySelector('.avatar-crop-backdrop').onclick = () => this.closeCropModal();
  },

  async loadUserProfile(userId) {
    if (!Auth.isLoggedIn()) return showToast('Войдите, чтобы просматривать профили');

    if (userId === Auth.user?.id) {
      Router.navigate('profile');
      return;
    }

    this.viewingUserId = userId;
    Router.navigate('profile');

    try {
      const user = await API.get(`/users/profile/${userId}`);

      document.getElementById('profile-avatar').src = `assets/avatars/${user.avatar || 'Admin.png'}`;
      document.getElementById('profile-name').textContent = user.name;
      document.getElementById('profile-role').textContent = user.role;
      document.getElementById('profile-group').textContent = user.group_name || '';

      document.getElementById('profile-edit-name').value = user.name || '';
      document.getElementById('profile-edit-email').value = '';
      document.getElementById('profile-edit-group').value = user.group_name || '';
      document.getElementById('profile-edit-age').value = user.age || '';
      document.getElementById('profile-edit-birthday').value = user.birthday?.substring(0, 10) || '';

      // Disable all inputs
      document.querySelectorAll('.profile-input').forEach(i => i.disabled = true);

      // Hide edit/save buttons
      document.getElementById('profile-edit-btn').style.display = 'none';
      document.getElementById('profile-save-btn').style.display = 'none';

      // Add back button
      const container = document.querySelector('#page-profile');
      const existingBack = container.querySelector('.profile-back-btn');
      if (!existingBack) {
        const backBtn = document.createElement('button');
        backBtn.className = 'profile-back-btn';
        backBtn.innerHTML = '&larr; Назад';
        backBtn.addEventListener('click', () => {
          this.viewingUserId = null;
          this.load();
        });
        const firstChild = container.querySelector('.section-header');
        if (firstChild && firstChild.nextSibling) {
          container.insertBefore(backBtn, firstChild.nextSibling);
        } else {
          container.appendChild(backBtn);
        }
      }

      // Add action buttons
      const profileLeft = container.querySelector('.profile-left');
      if (profileLeft) {
        let viewActions = profileLeft.querySelector('.profile-view-actions');
        if (!viewActions) {
          viewActions = document.createElement('div');
          viewActions.className = 'profile-view-actions';
          profileLeft.appendChild(viewActions);
        }

        viewActions.innerHTML = `
          <button class="profile-view-btn message-btn" data-uid="${user.id}">Написать</button>
          <button class="profile-view-btn friend-btn ${user.is_friend ? 'is-friend' : ''}" data-uid="${user.id}">
            ${user.is_friend ? 'Удалить из друзей' : 'Добавить в друзья'}
          </button>
        `;

        viewActions.querySelector('.message-btn').addEventListener('click', () => {
          Router.navigate('chat');
          setTimeout(() => Chat.openChatById(user.id), 500);
        });

        const friendBtn = viewActions.querySelector('.friend-btn');
        friendBtn.addEventListener('click', async () => {
          try {
            if (user.is_friend) {
              await API.post('/friends/remove', { userId: user.id });
              showToast('Друг удален');
              user.is_friend = false;
            } else {
              await API.post('/friends/add', { userId: user.id });
              showToast('Друг добавлен');
              user.is_friend = true;
            }
            friendBtn.className = `profile-view-btn friend-btn ${user.is_friend ? 'is-friend' : ''}`;
            friendBtn.textContent = user.is_friend ? 'Удалить из друзей' : 'Добавить в друзья';
          } catch (err) { showToast(err.message || 'Ошибка'); }
        });
      }
    } catch (e) {
      showToast('Не удалось загрузить профиль');
      console.error(e);
    }
  },

  toggleEdit() {
    this.editing = !this.editing;
    const inputs = document.querySelectorAll('.profile-input');
    inputs.forEach(i => {
      if (i.id !== 'profile-edit-email') i.disabled = !this.editing;
    });
    document.getElementById('profile-edit-btn').style.display = this.editing ? 'none' : 'block';
    document.getElementById('profile-save-btn').style.display = this.editing ? 'block' : 'none';

    // Toggle avatar edit overlay
    const avatarWrapper = document.getElementById('profile-avatar-wrapper');
    avatarWrapper.classList.toggle('editable', this.editing);
    if (!this.editing) this.avatarFile = null;
  },

  openCropModal(imageSrc) {
    const modal = document.getElementById('avatar-crop-modal');
    const img = document.getElementById('avatar-crop-image');
    img.src = imageSrc;
    modal.style.display = 'flex';

    // Destroy previous cropper if exists
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }

    // Wait for image to load before initializing Cropper
    img.onload = () => {
      this.cropper = new Cropper(img, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.9,
        cropBoxResizable: true,
        cropBoxMovable: true,
        guides: true,
        center: true,
        background: false,
      });
    };
  },

  saveCrop() {
    if (!this.cropper) return;
    const canvas = this.cropper.getCroppedCanvas({
      width: 300,
      height: 300,
      imageSmoothingQuality: 'high'
    });
    canvas.toBlob((blob) => {
      this.avatarFile = new File([blob], 'avatar.png', { type: 'image/png' });
      // Update preview
      document.getElementById('profile-avatar').src = canvas.toDataURL('image/png');
      this.closeCropModal();
    }, 'image/png');
  },

  closeCropModal() {
    const modal = document.getElementById('avatar-crop-modal');
    modal.style.display = 'none';
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
  },

  async save() {
    try {
      const formData = new FormData();
      formData.append('name', document.getElementById('profile-edit-name').value);
      formData.append('group_name', document.getElementById('profile-edit-group').value);
      const age = document.getElementById('profile-edit-age').value;
      if (age) formData.append('age', age);
      const birthday = document.getElementById('profile-edit-birthday').value;
      if (birthday) formData.append('birthday', birthday);
      if (this.avatarFile) formData.append('avatar', this.avatarFile);

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        credentials: 'include',
        body: formData
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      const updated = await res.json();

      // Update Auth.user and all avatars everywhere
      if (updated.avatar) Auth.user.avatar = updated.avatar;
      if (updated.name) Auth.user.name = updated.name;
      Auth.updateUI();

      showToast('Профиль обновлен');
      this.toggleEdit();
      this.load();
    } catch (e) { showToast(e.message); }
  }
};
