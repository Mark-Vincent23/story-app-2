import PageTransition from "../../utils/page-transition";
import StoryAPI from "../../data/api";
import AuthHelper from "../../utils/auth-helper";
import { showFormattedDate } from "../../utils/index";
import FavoritesManager from "./favorites-manager";

class FavoritesPage {
  constructor() {
    this.favoritesManager = null;
  }
  
  async render() {
    return `
      <div class="container favorites-page">
        <h2 class="page-title">Favorite Stories</h2>
        <div class="offline-notice">
          <p>Favorite stories are available offline!</p>
        </div>
        <div id="favorites-container" class="favorites-container">
          <!-- Favorites will be rendered here -->
          <div class="loading-indicator">Loading your favorites...</div>
        </div>
      </div>
    `;
  }  async afterRender() {
    // Check if user is logged in
    if (!AuthHelper.isUserLoggedIn()) {
      window.location.hash = "#/login";
      return;
    }

    // Initialize favorites manager
    const favoritesContainer = document.getElementById("favorites-container");
    this.favoritesManager = new FavoritesManager(favoritesContainer);
    await this.favoritesManager.init();

    // Start page transition
    PageTransition.start();
    
    // Check network status
    this.updateOfflineNotice();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.updateOfflineNotice());
    window.addEventListener('offline', () => this.updateOfflineNotice());
  }
  
  updateOfflineNotice() {
    const offlineNotice = document.querySelector('.offline-notice');
    if (!offlineNotice) return;
    
    if (navigator.onLine) {
      offlineNotice.innerHTML = `
        <p>Favorite stories are available offline!</p>
      `;
      offlineNotice.classList.remove('offline');
    } else {
      offlineNotice.innerHTML = `
        <p><strong>You are currently offline.</strong> Don't worry, your favorite stories are still available!</p>
      `;
      offlineNotice.classList.add('offline');
    }
  }
  
  async cleanup() {
    // Remove event listeners
    window.removeEventListener('online', () => this.updateOfflineNotice());
    window.removeEventListener('offline', () => this.updateOfflineNotice());
  }

  async loadFavoriteStories() {
    const favoritesContainer = document.getElementById("favorites-list");
    
    try {
      // Show loading state
      favoritesContainer.innerHTML = '<div class="loading-indicator">Loading favorite stories...</div>';
      
      // Get favorite stories from IndexedDB
      const favorites = await StoryAPI.getFavoriteStories();
      
      if (favorites.length === 0) {
        favoritesContainer.innerHTML = `
          <div class="empty-state">
            <p>You haven't added any favorite stories yet.</p>
            <a href="#/" class="button primary-button">Explore Stories</a>
          </div>
        `;
        return;
      }
      
      // Create HTML for favorite stories
      const storiesHTML = favorites.map((story) => `
        <div class="story-card" data-id="${story.id}">
          <div class="story-image-container">
            <img src="${story.photoUrl}" alt="${story.name}" class="story-image">
          </div>
          <div class="story-content">
            <h3 class="story-title">${story.name}</h3>
            <p class="story-date">${showFormattedDate(story.createdAt)}</p>
            <p class="story-description">${story.description.substring(0, 100)}${story.description.length > 100 ? '...' : ''}</p>
            <div class="story-actions">
              <a href="#/detail/${story.id}" class="button view-button">View Story</a>
              <button class="button remove-favorite-button" data-id="${story.id}">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
      
      // Render stories
      favoritesContainer.innerHTML = storiesHTML;
      
      // Add event listeners for remove buttons
      document.querySelectorAll('.remove-favorite-button').forEach(button => {
        button.addEventListener('click', async (event) => {
          const storyId = event.target.dataset.id;
          await this.removeFromFavorites(storyId);
        });
      });
      
    } catch (error) {
      console.error('Error loading favorite stories:', error);
      favoritesContainer.innerHTML = `
        <div class="error-state">
          <p>Failed to load favorite stories. ${error.message}</p>
          <button id="retry-load-favorites" class="button primary-button">Retry</button>
        </div>
      `;
      
      // Add retry button event listener
      document.getElementById('retry-load-favorites')?.addEventListener('click', () => {
        this.loadFavoriteStories();
      });
    }
  }
  
  async removeFromFavorites(storyId) {
    try {
      // Show confirmation dialog
      if (!confirm('Are you sure you want to remove this story from favorites?')) {
        return;
      }
      
      // Remove from favorites
      await StoryAPI.removeFromFavorites(storyId);
      
      // Reload the favorites list
      await this.loadFavoriteStories();
      
    } catch (error) {
      console.error('Error removing from favorites:', error);
      alert(`Failed to remove from favorites: ${error.message}`);
    }
  }
  
  async cleanup() {
    // Clean up any event listeners if needed
  }
}

export default FavoritesPage;
