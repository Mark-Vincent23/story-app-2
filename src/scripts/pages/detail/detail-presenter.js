import AuthHelper from "../../utils/auth-helper";
import { addStory } from '../../utils/indexeddb-helper.js';
import NotificationHelper from '../../utils/notification-helper.js';

export default class DetailPresenter {
  #model;
  #view;
  #map = null;
  #marker = null;
  #storyId = null;

  constructor({ model, view }) {
    this.#model = model;
    this.#view = view;
  }

  async showStoryDetail(id) {
    this.#storyId = id;

    try {
      // Check authentication first
      if (!(await this.checkAuthentication())) {
        return;
      }

      // Show loading state
      this.#view.showLoading();

      // Get story details from the model
      const story = await this.#model.getStoryDetail(id);

      // Update the view with story details
      this.#view.showStoryDetail(story);
      
      // Set up event handlers
      this._setupEventHandlers(story);

      // Tambahkan handler untuk tombol simpan lokal
      this.#view.setSaveLocalHandler(async () => {
        try {
          await addStory(story);
          NotificationHelper.showNotification({
            title: 'Berhasil disimpan!',
            options: {
              body: `Story \"${story.name}\" telah disimpan ke database lokal!`,
              icon: '/images/logo-192x192.png',
            },
          });
        } catch (error) {
          NotificationHelper.showNotification({
            title: 'Gagal menyimpan story',
            options: {
              body: error.message,
              icon: '/images/logo-192x192.png',
            },
          });
        }
      });

      // Initialize map if story has location
      if (story.lat && story.lon) {
        this._initMap(story);
      }
    } catch (error) {
      this.#view.showError(error.message);
    }
  }
  
  _setupEventHandlers(story) {
    // Set up favorite handler
    this.#view.setFavoriteHandler(async (isFavorite) => {
      try {
        if (isFavorite) {
          // Add to favorites
          await this.#model.addToFavorites(story);
        } else {
          // Remove from favorites
          await this.#model.removeFromFavorites(story.id);
        }
      } catch (error) {
        console.error('Error toggling favorite status:', error);
      }
    });
    
    // Set up share handler
    this.#view.setShareHandler(() => {
      this._shareStory(story);
    });
  }
  
  _shareStory(story) {
    if (navigator.share) {
      navigator.share({
        title: `Story by ${story.name}`,
        text: story.description.substring(0, 100) + (story.description.length > 100 ? '...' : ''),
        url: window.location.href,
      })
      .then(() => console.log('Story shared successfully'))
      .catch((error) => console.error('Error sharing story:', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      const tempInput = document.createElement('input');
      document.body.appendChild(tempInput);
      tempInput.value = window.location.href;
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      
      alert('Story URL copied to clipboard!');
    }
  }

  _initMap(story) {
    // Wait for the DOM to be fully updated
    setTimeout(() => {
      // Initialize map
      this.#map = this.#view.initMap();

      // Check if map was successfully initialized
      if (!this.#map) {
        console.error("Failed to initialize map");
        return;
      }

      // Add marker for story location
      this.#marker = this.#view.addMarker(this.#map, {
        lat: story.lat,
        lng: story.lon,
        title: story.name,
        id: story.id,
      });

      // Center map on the marker only if both map and marker exist
      if (this.#map && this.#marker) {
        this.#view.centerMapOnMarker(this.#map, this.#marker);
      }
    }, 100);
  }

  async checkAuthentication() {
    if (!AuthHelper.isUserLoggedIn()) {
      this.#view.showAuthRequired();
      return false;
    }
    return true;
  }

  setupEventListeners() {
    // Set up event listeners for the view
    this.#view.setBackButtonHandler(() => {
      window.location.hash = "#/";
    });

    this.#view.setLikeButtonHandler(async () => {
      try {
        await this.#model.likeStory(this.#storyId);
        // Refresh story details to update like count
        this.showStoryDetail(this.#storyId);
      } catch (error) {
        this.#view.showError(error.message);
      }
    });
  }

  cleanup() {
    // Clean up resources when navigating away from the page
    if (this.#marker) {
      this.#view.removeMarker(this.#marker);
      this.#marker = null;
    }
    this.#map = null;
    this.#view.cleanup();
  }
}
