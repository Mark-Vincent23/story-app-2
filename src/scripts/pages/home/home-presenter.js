import AuthHelper from "../../utils/auth-helper";
import NotificationHelper from "../../utils/notification-helper";
import { addStory } from "../../utils/indexeddb-helper";

export default class HomePresenter {
  #model;
  #view;
  #markers = [];
  #map = null;
  #lastFetchTime = 0;
  #pollingInterval = null;

  constructor({ model, view }) {
    this.#model = model;
    this.#view = view;

    this._initListeners();
  }

  _initListeners() {
    // Set up event listeners for the view
    this.#view.setLogoutHandler(() => {
      AuthHelper.logout();
    });

    this.#view.setStoryClickHandler((id) => {
      window.location.hash = `#/detail/${id}`;
    });

    // Set up favorite handler
    this.#view.setFavoriteHandler(async (storyId, isFavorite) => {
      try {
        const story = await this.#model.getStoryDetail(storyId);

        if (isFavorite) {
          // Add to favorites
          await this.#model.addToFavorites(story);
        } else {
          // Remove from favorites
          await this.#model.removeFromFavorites(storyId);
        }
      } catch (error) {
        console.error("Error toggling favorite status:", error);
        // Show error notification
        NotificationHelper.showNotification({
          title: "Error",
          options: {
            body: `Failed to ${
              isFavorite ? "add to" : "remove from"
            } favorites: ${error.message}`,
            icon: "/images/logo-192x192.png",
          },
        });
      }
    });

    // Set up save handler
    this.#view.setSaveHandler(async (storyId) => {
      try {
        const story = await this.#model.getStoryDetail(storyId);
        await addStory(story);
        NotificationHelper.showNotification({
          title: "Berhasil disimpan!",
          options: {
            body: `Story \"${story.name}\" telah disimpan ke database lokal!`,
            icon: "/images/logo-192x192.png",
          },
        });
      } catch (error) {
        NotificationHelper.showNotification({
          title: "Gagal menyimpan story",
          options: {
            body: error.message,
            icon: "/images/logo-192x192.png",
          },
        });
      }
    });
  }

  async showStories() {
    try {
      // Show loading state
      this.#view.showLoading();

      // Get stories from the model
      const stories = await this.#model.getStories();

      // Update the view with stories
      this.#view.showStories(stories);

      // Initialize map with story locations
      this._initMap(stories);

      // Start polling for new stories
      this._startPollingForNewStories();
    } catch (error) {
      this.#view.showError(error.message);
    }
  }

  _initMap(stories) {
    if (!stories || stories.length === 0) return;

    // Initialize map
    this.#map = this.#view.initMap();

    // Clear existing markers
    this._clearMarkers();

    // Add markers for each story with location
    stories.forEach((story) => {
      if (story.lat && story.lon) {
        const marker = this.#view.addMarker(this.#map, {
          lat: story.lat,
          lng: story.lon,
          title: story.name,
          id: story.id,
        });

        this.#markers.push(marker);
      }
    });

    // Fit map bounds to show all markers
    this.#view.fitMapToMarkers(this.#map, this.#markers);
  }

  _clearMarkers() {
    this.#markers.forEach((marker) => {
      this.#view.removeMarker(marker);
    });
    this.#markers = [];
  }

  async checkAuthentication() {
    if (!AuthHelper.isUserLoggedIn()) {
      window.location.hash = "#/login";
      return false;
    }
    return true;
  }

  _startPollingForNewStories() {
    // Clear any existing interval
    if (this.#pollingInterval) {
      clearInterval(this.#pollingInterval);
    }

    // Poll for new stories every 30 seconds
    this.#pollingInterval = setInterval(async () => {
      try {
        const stories = await this.#model.getStories();
        const newStories = this.#model._detectNewStories(stories);

        if (newStories.length > 0) {
          // Send notification for new stories
          if (newStories.length === 1) {
            await NotificationHelper.sendNewStoryReceivedNotification(newStories[0]);
          } else {
            await NotificationHelper.sendNewStoriesReceivedNotification(newStories, newStories.length);
          }

          // Update the view with all stories
          this.#view.showStories(stories);

          // Update the map
          this._initMap(stories);
        }
      } catch (error) {
        console.error("Error polling for new stories:", error);
      }
    }, 30000); // 30 seconds
  }

  cleanup() {
    // Clean up resources when navigating away from the page
    this._clearMarkers();
    this.#map = null;

    // Clear polling interval
    if (this.#pollingInterval) {
      clearInterval(this.#pollingInterval);
      this.#pollingInterval = null;
    }

    this.#view.cleanup();
  }
}
