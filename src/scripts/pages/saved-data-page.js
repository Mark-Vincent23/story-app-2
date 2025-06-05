// src/scripts/pages/saved-data-page.js
import { getAllStories, deleteStory, addStory } from '../utils/indexeddb-helper.js';

const SavedDataPage = {
  async render() {
    return `
      <section class="saved-data">
        <h2>Data Tersimpan (IndexedDB) story yang dipost akan secara otomatis masuk ke sini</h2>
        <div id="stories-list">Loading...</div>
      </section>
    `;
  },
  async afterRender() {
    const container = document.getElementById('stories-list');
    const stories = await getAllStories();
    if (!stories.length) {
      container.innerHTML = '<p>Tidak ada data tersimpan.</p>';
      return;
    }
    container.innerHTML = stories.map(story => `
      <div class="story-item" data-id="${story.id}">
        <span>${story.title || 'Tanpa Judul'}</span>
        <button class="delete-btn" data-id="${story.id}">Hapus</button>
      </div>
    `).join('');
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = Number(e.target.dataset.id);
        await deleteStory(id);
        this.afterRender();
      });
    });
  }
};

export default SavedDataPage;
