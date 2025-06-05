import AuthHelper from "../../utils/auth-helper";
import HomePresenter from "./home-presenter";
import HomeView from "./home-view";
import StoryModel from "./story-model";
import NotificationHelper from "../../utils/notification-helper";
import { checkOfflineReady } from "../../utils/offline-helper";

export default class HomePage {
  constructor() {
    this._view = new HomeView();
    this._model = new StoryModel();
    this._presenter = new HomePresenter({
      view: this._view,
      model: this._model,
    });
    this._isOffline = !navigator.onLine;
  }

  async render() {
    return `
      <section class="container">
        <div id="skip-content" class="skip-content" tabindex="-1"></div>
        <div class="header-container d-flex justify-content-between align-items-center mb-4">
          <h1 class="page-title"><i class="fas fa-book-open icon"></i>Story App</h1>
          <div id="offline-notice" class="offline-notice" style="display: none;">
            <i class="fas fa-wifi-slash"></i> Offline Mode
          </div>
        </div>
        
        <div class="story-list" id="story-list">
          <div class="loading-indicator">
            <i class="fas fa-spinner fa-spin"></i> Loading stories...
          </div>
        </div>
        
        <div id="map" class="map-container mb-4"></div>
        
        <a href="#/add" class="add-button requires-online" aria-label="Add new story">
          <img src="./images/992651.png" width="50px" alt="Story App Logo" class="add-button-logo">
          <i class="fas fa-plus"></i>
        </a>
        
        <a href="#/saved" class="btn btn-secondary" style="margin-top: 1rem;">
          <i class="fas fa-database"></i> Data Tersimpan
        </a>
      </section>
    `;
  }
  
  async afterRender() {
    // Check offline status and update UI
    this._updateOfflineStatus();
    
    // Add event listeners for online/offline events
    window.addEventListener('online', () => this._updateOfflineStatus());
    window.addEventListener('offline', () => this._updateOfflineStatus());
    
    // Initialize notification system
    await this._initNotifications();
    
    // Check if user is authenticated
    const isAuthenticated = await this._presenter.checkAuthentication();

    if (isAuthenticated) {
      // Load and display stories
      await this._presenter.showStories();
    }
  }
  
  _updateOfflineStatus() {
    const isOffline = !navigator.onLine;
    this._isOffline = isOffline;
    
    // Update offline notice
    const offlineNotice = document.getElementById('offline-notice');
    if (offlineNotice) {
      offlineNotice.style.display = isOffline ? 'flex' : 'none';
    }
    
    // Disable add button when offline
    const addButton = document.querySelector('.add-button');
    if (addButton) {
      if (isOffline) {
        addButton.classList.add('disabled');
        addButton.title = 'Adding stories requires an internet connection';
      } else {
        addButton.classList.remove('disabled');
        addButton.title = 'Add new story';
      }
    }
    
    // Check if offline content is available
    if (isOffline) {
      this._checkOfflineContent();
    }
  }
  
  async _checkOfflineContent() {
    const isOfflineReady = await checkOfflineReady();
    console.log('Offline content available:', isOfflineReady);
    
    // Show appropriate message if no stories are displayed
    const storyList = document.getElementById('story-list');
    if (storyList && storyList.children.length === 0) {
      storyList.innerHTML = `
        <div class="offline-message">
          <i class="fas fa-wifi-slash fa-2x"></i>
          <h3>You're offline</h3>
          <p>${isOfflineReady ? 
            'Check your saved stories in the Favorites section.' : 
            'No cached content available. Connect to the internet to load stories.'}
          </p>
          <a href="#/favorites" class="btn btn-primary mt-3">
            <i class="fas fa-heart icon"></i>View Favorites
          </a>
        </div>
      `;
    }
  }
  
  async _initNotifications() {
    try {
      // Register service worker for notifications
      await NotificationHelper.registerServiceWorker();
      
      // Create notification toggle button
      await NotificationHelper.createNotificationToggleButton('notification-container');
      
      // Create toggle for new stories notifications
      NotificationHelper.createNewStoriesNotificationToggle('notification-container');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  async cleanup() {
    // Remove event listeners
    window.removeEventListener('online', () => this._updateOfflineStatus());
    window.removeEventListener('offline', () => this._updateOfflineStatus());
    
    if (this._presenter) {
      await this._presenter.cleanup();
    }
  }
}
