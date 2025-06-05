import DBHelper from '../../data/db-helper';
import { showFormattedDate } from '../../utils/index';

class FavoritesManager {
  constructor(container) {
    this.container = container;
    this.favoriteStories = [];
  }

  async init() {
    // Load the favorites from IndexedDB
    await this.loadFavorites();
    
    // Render the favorites list
    this.render();
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  async loadFavorites() {
    try {
      // Get all stories from IndexedDB
      const allStories = await DBHelper.getStories();
      
      // Filter only favorites
      this.favoriteStories = allStories.filter(story => story.isFavorite === true);
    } catch (error) {
      console.error('Error loading favorites:', error);
      this.favoriteStories = [];
    }
  }
  
  render() {
    if (!this.container) return;
    
    if (this.favoriteStories.length === 0) {
      this.container.innerHTML = `
        <div class="empty-favorites">
          <p>You don't have any favorite stories yet.</p>
          <a href="#/" class="button primary-button">Browse Stories</a>
        </div>
      `;
      return;
    }
    
    const favoritesHTML = this.favoriteStories.map(story => `
      <div class="favorite-item" data-id="${story.id}">
        <div class="favorite-image">
          <img src="${story.photoUrl}" alt="${story.name}'s story" loading="lazy">
        </div>
        <div class="favorite-content">
          <h3>${story.name}</h3>
          <p class="favorite-date">${showFormattedDate(story.createdAt)}</p>
          <p class="favorite-description">${this.truncateText(story.description, 100)}</p>
          <div class="favorite-actions">
            <a href="#/detail/${story.id}" class="view-button">View</a>
            <button class="remove-button" data-id="${story.id}">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
    
    this.container.innerHTML = `
      <div class="favorites-header">
        <h2>Your Favorite Stories</h2>
        <p>Stories available offline</p>
      </div>
      <div class="favorites-list">
        ${favoritesHTML}
      </div>
    `;
  }
  
  setupEventListeners() {
    if (!this.container) return;
    
    // Add event delegation for remove buttons
    this.container.addEventListener('click', async (event) => {
      if (event.target.classList.contains('remove-button')) {
        const storyId = event.target.dataset.id;
        await this.removeFromFavorites(storyId);
      }
    });
  }
  
  async removeFromFavorites(storyId) {
    try {
      // Get the story from IndexedDB
      const story = await DBHelper.getStoryById(storyId);
      
      if (!story) {
        throw new Error('Story not found');
      }
      
      // Update the favorite flag
      story.isFavorite = false;
      
      // Save back to IndexedDB
      await DBHelper.saveStory(story);
      
      // Reload and rerender
      await this.loadFavorites();
      this.render();
      
      // Show notification
      this.showNotification('Story removed from favorites');
    } catch (error) {
      console.error('Error removing from favorites:', error);
      this.showNotification('Error removing from favorites', 'error');
    }
  }
  
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
  
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

export default FavoritesManager;
