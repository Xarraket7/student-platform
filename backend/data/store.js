const fs = require('fs');
const path = require('path');

const DATA_DIR = __dirname;

class JsonStore {
  constructor() {
    this.data = {};
    this.counters = {};
    this.tables = [
      'users', 'communities', 'posts', 'comments', 'likes',
      'messages', 'notifications', 'events', 'announcements', 'gallery'
    ];
    this.load();
  }

  load() {
    for (const table of this.tables) {
      const filePath = path.join(DATA_DIR, `${table}.json`);
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        this.data[table] = JSON.parse(raw);
      } catch (e) {
        this.data[table] = [];
        this.save(table);
      }
      const maxId = this.data[table].reduce((max, item) => Math.max(max, item.id || 0), 0);
      this.counters[table] = maxId + 1;
    }
    console.log('JSON Store loaded:', this.tables.map(t => `${t}(${this.data[t].length})`).join(', '));
  }

  save(table) {
    const filePath = path.join(DATA_DIR, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(this.data[table], null, 2), 'utf-8');
  }

  getAll(table) {
    return [...this.data[table]];
  }

  getById(table, id) {
    return this.data[table].find(item => item.id === parseInt(id));
  }

  findOne(table, predicate) {
    return this.data[table].find(predicate);
  }

  find(table, predicate) {
    return this.data[table].filter(predicate);
  }

  count(table, predicate) {
    return this.data[table].filter(predicate).length;
  }

  insert(table, record) {
    const id = this.counters[table]++;
    const newRecord = { id, ...record, created_at: new Date().toISOString() };
    this.data[table].push(newRecord);
    this.save(table);
    return newRecord;
  }

  update(table, id, updates) {
    const index = this.data[table].findIndex(item => item.id === parseInt(id));
    if (index === -1) return null;
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null && value !== '') {
        this.data[table][index][key] = value;
      }
    }
    this.save(table);
    return this.data[table][index];
  }

  updateWhere(table, predicate, updates) {
    let count = 0;
    this.data[table].forEach((item, i) => {
      if (predicate(item)) {
        for (const [key, value] of Object.entries(updates)) {
          this.data[table][i][key] = value;
        }
        count++;
      }
    });
    if (count > 0) this.save(table);
    return count;
  }

  remove(table, id) {
    const index = this.data[table].findIndex(item => item.id === parseInt(id));
    if (index === -1) return false;
    this.data[table].splice(index, 1);
    this.save(table);
    return true;
  }

  removeWhere(table, predicate) {
    const before = this.data[table].length;
    this.data[table] = this.data[table].filter(item => !predicate(item));
    if (this.data[table].length !== before) this.save(table);
    return before - this.data[table].length;
  }
}

module.exports = new JsonStore();
