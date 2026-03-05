// API Helper
const API = {
  base: '/api',

  async request(url, options = {}) {
    try {
      const res = await fetch(this.base + url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  delete(url) { return this.request(url, { method: 'DELETE' }); },

  async upload(url, formData) {
    const res = await fetch(this.base + url, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  },

  async uploadPut(url, formData) {
    const res = await fetch(this.base + url, {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
    return data;
  }
};

// Toast notification
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  gsap.fromTo(toast, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 });
  setTimeout(() => {
    gsap.to(toast, { opacity: 0, y: 20, duration: 0.3, onComplete: () => { toast.style.display = 'none'; } });
  }, duration);
}

// Time formatter
function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} дн назад`;
  return date.toLocaleDateString('ru-RU');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
