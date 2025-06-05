import PageTransition from "../../utils/page-transition";
import MapHelper from "../../utils/map-helper";
import { showFormattedDate } from "../../utils/index";

export default class HomeView {
  constructor() {
    this._map = null;
    this._logoutHandler = null;
    this._storyClickHandler = null;
    this._favoriteHandler = null;
    this._saveHandler = null;
  }

  setLogoutHandler(handler) {
    this._logoutHandler = handler;

    // Add logout button event listener
    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        this._logoutHandler();
      });
    }
  }

  setStoryClickHandler(handler) {
    this._storyClickHandler = handler;

    // Event delegation for story clicks
    const storyList = document.getElementById("story-list");
    if (storyList) {
      storyList.addEventListener("click", (event) => {
        const storyLink = event.target.closest(".story-link");
        if (storyLink) {
          event.preventDefault();
          const storyId = storyLink.getAttribute("href").split("/").pop();
          this._storyClickHandler(storyId);
        }
      });
    }
  }

  setFavoriteHandler(handler) {
    this._favoriteHandler = handler;

    // Event delegation for favorite button clicks
    const storyList = document.getElementById("story-list");
    if (storyList) {
      storyList.addEventListener("click", (event) => {
        const favoriteButton = event.target.closest(".favorite-button");
        if (favoriteButton) {
          event.preventDefault();
          event.stopPropagation();
          const storyId = favoriteButton.getAttribute("data-id");
          const isActive = favoriteButton.classList.contains("active");

          // Toggle the active class
          favoriteButton.classList.toggle("active");

          // Call the handler
          this._favoriteHandler(storyId, !isActive);
        }
      });
    }
  }

  setSaveHandler(handler) {
    this._saveHandler = handler;
  }

  showLoading() {
    const storyListContainer = document.getElementById("story-list");
    const loadingContent = `
      <div class="loading-indicator">
        <i class="fas fa-spinner fa-spin"></i> Loading stories...
      </div>
    `;

    PageTransition.fadeTransition(storyListContainer, loadingContent);
  }

  async showStories(stories) {
    const storyListContainer = document.getElementById("story-list");

    if (stories.length === 0) {
      const emptyContent = `
        <div class="empty-state">
          <i class="fas fa-book-open fa-3x"></i>
          <h3>No stories yet</h3>
          <p>Be the first to share your story!</p>
          <a href="#/add" class="btn btn-primary mt-3">
            <i class="fas fa-plus icon"></i>Add Story
          </a>
        </div>
      `;
      await PageTransition.fadeTransition(storyListContainer, emptyContent);
      return;
    }

    let storyHTML = "";
    stories.forEach((story) => {
      storyHTML += this._createStoryHTML(story);
    });

    await PageTransition.fadeTransition(storyListContainer, storyHTML);
  }

  async showError(message) {
    const storyListContainer = document.getElementById("story-list");
    const errorContent = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle icon"></i>${message}
      </div>
    `;

    await PageTransition.fadeTransition(storyListContainer, errorContent);
  }
  _createStoryHTML(story) {
    const formattedDate = showFormattedDate(story.createdAt);
    const isFavorite = story.isFavorite ? 'active' : '';

    return `
      <article class="card story-item">
        <a href="#/detail/${story.id}" class="story-link">
          <div class="story-image-container">
            <img src="${story.photoUrl}" alt="Story by ${
      story.name
    }" class="story-image">
            <button class="favorite-button ${isFavorite}" data-id="${story.id}" title="${story.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
              <i class="fas fa-heart"></i>
            </button>
            
          </div>
          <div class="story-content">
            <h2 class="story-name">${story.name}</h2>
            <p class="story-description">${this._truncateText(
              story.description,
              120
            )}</p>
            <div class="story-meta">
              <p class="story-date">
                <i class="far fa-calendar-alt icon"></i>${formattedDate}
              </p>
              ${
                story.lat && story.lon
                  ? `
                <p class="story-location">
                  <i class="fas fa-map-marker-alt icon"></i>View on map
                </p>
              `
                  : ""
              }
            </div>
          </div>
        </a>
      </article>
    `;
  }

  _truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  initMap() {
    // Initialize the map with multiple layer options
    this._map = MapHelper.initMap("map", {
      center: [-2.5489, 118.0149], // Center of Indonesia
      zoom: 5,
      defaultLayer: "openStreetMap",
    });

    return this._map;
  }

  addMarker(map, { lat, lng, title, id }) {
    // Create custom marker icon
    const storyIcon = MapHelper.createCustomIcon(
      "https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png"
    );

    // Create popup content
    const popupContent = `
      <div class="map-popup">
        <h3>${title}</h3>
        <a href="#/detail/${id}" class="btn btn-sm btn-primary">View Details</a>
      </div>
    `;

    // Add marker to map
    return MapHelper.addMarker(map, lat, lng, {
      popup: popupContent,
      icon: storyIcon,
    });
  }

  removeMarker(marker) {
    if (marker && this._map) {
      marker.remove();
    }
  }

  fitMapToMarkers(map, markers) {
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }

  cleanup() {
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
  }
}
