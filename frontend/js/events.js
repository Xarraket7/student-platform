// Events Page
const Events = {
  async load() {
    try {
      const events = await API.get('/events');
      const grid = document.getElementById('events-grid');

      grid.innerHTML = events.map(e => `
        <div class="event-card">
          <div class="event-card-header">
            <img src="assets/icons/events/${e.icon}" alt="" class="event-card-icon">
            <div class="event-card-title">${e.title}</div>
          </div>
          <div class="event-card-desc">${e.description}</div>
          <div class="event-card-meta">
            ${e.event_date ? `<span>📅 ${formatDate(e.event_date)}</span>` : ''}
            ${e.event_time ? `<span>🕐 ${e.event_time?.substring(0, 5)}</span>` : ''}
          </div>
        </div>
      `).join('');

      // Animate
      gsap.fromTo(grid.children, { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' });
    } catch (e) { console.error(e); }
  }
};
