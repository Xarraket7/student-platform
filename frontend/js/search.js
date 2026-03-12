// Search with live autocomplete
const Search = {
  debounceTimer: null,
  isOpen: false,

  init() {
    // Desktop search
    const desktopInput = document.getElementById('desktop-search-input');
    const desktopDropdown = document.getElementById('desktop-search-dropdown');
    if (desktopInput) {
      this.bindInput(desktopInput, desktopDropdown);
    }

    // Mobile search
    const mobileInput = document.getElementById('mobile-search-input');
    const mobileDropdown = document.getElementById('mobile-search-dropdown');
    if (mobileInput) {
      this.bindInput(mobileInput, mobileDropdown);
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-bar') && !e.target.closest('.mobile-search-overlay')) {
        this.closeAll();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAll();
    });
  },

  bindInput(input, dropdown) {
    let selectedIndex = -1;

    input.addEventListener('input', () => {
      const query = input.value.trim();
      selectedIndex = -1;

      clearTimeout(this.debounceTimer);
      if (query.length < 1) {
        dropdown.innerHTML = '';
        dropdown.classList.remove('active');
        input.closest('.search-bar, .mobile-search-bar')?.classList.remove('search-active');
        return;
      }
      input.closest('.search-bar, .mobile-search-bar')?.classList.add('search-active');

      this.debounceTimer = setTimeout(() => this.search(query, dropdown), 200);
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.search-result-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        this.highlightItem(items, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        this.highlightItem(items, selectedIndex);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        items[selectedIndex].click();
      }
    });

    // Focus shows results if there's text
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 1 && dropdown.children.length > 0) {
        dropdown.classList.add('active');
      }
    });
  },

  highlightItem(items, index) {
    items.forEach(i => i.classList.remove('highlighted'));
    if (items[index]) {
      items[index].classList.add('highlighted');
      items[index].scrollIntoView({ block: 'nearest' });
    }
  },

  async search(query, dropdown) {
    try {
      const data = await API.get(`/search?q=${encodeURIComponent(query)}`);
      this.renderResults(data.results, dropdown, query);
    } catch (e) {
      dropdown.innerHTML = '<div class="search-no-results">Ошибка поиска</div>';
      dropdown.classList.add('active');
    }
  },

  renderResults(results, dropdown, query) {
    if (!results || results.length === 0) {
      dropdown.innerHTML = `
        <div class="search-no-results">
          <div class="search-no-results-icon">🔍</div>
          <div>Ничего не найдено</div>
        </div>`;
      dropdown.classList.add('active');
      return;
    }

    // Group by type
    const groups = {};
    const typeLabels = {
      community: 'Сообщества',
      post: 'Публикации',
      event: 'События',
      announcement: 'Объявления'
    };
    const typeIcons = {
      community: '👥',
      post: '📝',
      event: '📅',
      announcement: '📢'
    };

    results.forEach(r => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });

    let html = '';
    let itemIndex = 0;

    for (const [type, items] of Object.entries(groups)) {
      html += `<div class="search-group" data-type="${type}">`;
      html += `<div class="search-group-label" data-type="${type}"><span class="search-group-icon">${typeIcons[type] || '📄'}</span>${typeLabels[type] || type}<span class="search-group-count">${items.length}</span></div>`;

      items.forEach((item) => {
        const highlighted = this.highlightMatch(item.title, query);
        const isEmoji = item.icon && !item.icon.includes('.') && item.icon.length <= 4;
        const safeIcon = isEmoji ? item.icon : typeIcons[item.type] || '📄';
        const avatarHtml = item.avatar
          ? `<img src="assets/backgrounds/communities/${item.avatar}" class="search-result-avatar">`
          : `<span class="search-result-icon">${safeIcon}</span>`;

        html += `
          <div class="search-result-item" data-type="${item.type}" data-page="${item.page}" data-id="${item.id}" data-info='${JSON.stringify(item.data || {})}' style="animation-delay: ${itemIndex * 0.04}s">
            ${avatarHtml}
            <div class="search-result-text">
              <div class="search-result-title">${highlighted}</div>
              <div class="search-result-subtitle">${item.subtitle}</div>
            </div>
            <div class="search-result-arrow">→</div>
          </div>
        `;
        itemIndex++;
      });
      html += '</div>';
    }

    dropdown.innerHTML = html;
    dropdown.classList.add('active');

    // Click handlers
    dropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const page = el.dataset.page;
        let data = null;
        try { data = JSON.parse(el.dataset.info); } catch (e) {}

        if (page === 'community-inner' && data && data.slug) {
          Router.goToCommunity(data);
        } else {
          Router.navigate(page);
        }

        this.closeAll();
        // Clear inputs
        document.querySelectorAll('.search-input, .mobile-search-input').forEach(inp => inp.value = '');
        // Close mobile overlay
        const overlay = document.getElementById('mobile-search-overlay');
        if (overlay) overlay.classList.remove('active');
      });
    });
  },

  highlightMatch(text, query) {
    if (!text) return '';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  },

  closeAll() {
    document.querySelectorAll('.search-dropdown').forEach(d => {
      d.classList.remove('active');
    });
    document.querySelectorAll('.search-active').forEach(el => {
      el.classList.remove('search-active');
    });
  }
};
