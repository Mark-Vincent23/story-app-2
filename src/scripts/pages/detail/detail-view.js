import { showFormattedDate } from "../../utils/index";
import PageTransition from "../../utils/page-transition";
import MapHelper from "../../utils/map-helper";

export default class DetailView {
  constructor() {
    this.container = null;
    this.map = null;
  }

  getContainer() {
    return document.querySelector(".detail-container");
  }

  async render() {
    return `
      <section class="container detail-container">
        <div id="skip-content" class="visually-hidden" tabindex="-1"></div>
        <div class="loading-indicator text-center p-5">
          <i class="fas fa-spinner fa-spin fa-3x mb-3"></i>
          <p>Loading story details...</p>
        </div>
      </section>
    `;
  }

  showLoading() {
    this.container = this.getContainer();
    // Loading is already shown by default
  }

  showAuthRequired() {
    const authMessage = `
      <div class="card auth-message p-4">
        <h2><i class="fas fa-lock icon"></i>Authentication Required</h2>
        <p>You need to login to view story details.</p>
        <a href="#/login" class="btn btn-primary mt-3"><i class="fas fa-sign-in-alt icon"></i>Login</a>
      </div>
    `;

    return PageTransition.fadeTransition(this.container, authMessage);
  }

  async showStoryDetail(story) {
    const formattedDate = showFormattedDate(story.createdAt);

    const storyDetailHTML = `
      <div class="story-detail">
        <div class="card mb-4">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h1 class="story-detail-title mb-0">
              <i class="fas fa-book icon"></i>${story.name}'s Story
            </h1>
            <a href="#/" class="btn btn-outline btn-sm" id="back-button">
              <i class="fas fa-arrow-left icon"></i>Back
            </a>
          </div>
          
          <div class="story-detail-image-container">
            <img src="${story.photoUrl}" alt="Story by ${
      story.name
    }" class="story-detail-image">
          </div>
          
          <div class="card-body">
            <div class="story-meta mb-3">
              <p class="story-author">
                <i class="fas fa-user icon"></i>Author: <strong>${
                  story.name
                }</strong>
              </p>
              <p class="story-date">
                <i class="far fa-calendar-alt icon"></i>Posted on: ${formattedDate}
              </p>
            </div>
            
            <div class="story-content">
              <p class="story-description">${story.description}</p>
            </div>
              <div class="story-actions mt-4">
              
              <button id="save-local-button" class="btn btn-outline-success">
                <i class="fas fa-save icon"></i> Simpan ke Database Lokal
              </button>
              
            </div>
          </div>
        </div>
        
        ${
          story.lat && story.lon
            ? `
          <div class="card mb-4">
            <div class="card-header">
              <h2 class="location-title mb-0">
                <i class="fas fa-map-marker-alt icon"></i>Story Location
              </h2>
            </div>
            <div id="detail-map" class="detail-map"></div>
            <div class="card-footer">
              <p class="coordinates">
                <i class="fas fa-location-arrow icon"></i>
                Coordinates: ${story.lat.toFixed(6)}, ${story.lon.toFixed(6)}
              </p>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    return PageTransition.slideTransition(this.container, storyDetailHTML);
  }
  async afterRender() {
    // Get story ID from URL
    const url = window.location.hash;
    const id = url.substring(url.lastIndexOf("/") + 1);

    // Setup event listeners
    this._presenter.setupEventListeners();

    // Show story detail
    await this._presenter.showStoryDetail(id);
  }

  // Add this method to clean up resources when navigating away
  async beforeRender() {
    if (this._presenter) {
      this._presenter.cleanup();
    }
  }

  showError(message) {
    const errorMessage = `
      <div class="error-container text-center p-4">
        <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
        <h2>Error Loading Story</h2>
        <p>${message}</p>
        <a href="#/" class="btn btn-primary mt-3">
          <i class="fas fa-home icon"></i>Back to Home
        </a>
      </div>
    `;

    return PageTransition.fadeTransition(this.container, errorMessage);
  }

  initMap() {
    const mapContainer = document.getElementById("detail-map");
    console.log("Map container:", mapContainer);
    if (!mapContainer) {
      console.error("Map container element not found");
      return null;
    }

    const map = MapHelper.initMap("detail-map", {
      zoom: 12,
      defaultLayer: "openStreetMap",
    });
    console.log("Map initialized:", map);
    return map;
  }

  addMarker(map, { lat, lng, title }) {
    const storyIcon = MapHelper.createCustomIcon(
      "https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png"
    );

    return MapHelper.addMarker(map, lat, lng, {
      popup: `<div class="map-popup"><h3>${title}'s Story</h3></div>`,
      icon: storyIcon,
    });
  }

  centerMapOnMarker(map, marker) {
    if (map && marker) {
      map.setView(marker.getLatLng(), 12);
    }
  }

  removeMarker(marker) {
    if (marker) {
      marker.remove();
    }
  }

  setBackButtonHandler(handler) {
    const backButton = document.getElementById("back-button");
    if (backButton) {
      backButton.addEventListener("click", (e) => {
        e.preventDefault();
        handler();
      });
    }
  }

  setLikeButtonHandler(handler) {
    const likeButton = document.getElementById("like-button");
    if (likeButton) {
      likeButton.addEventListener("click", handler);
    }
  }
  setFavoriteHandler(handler) {
    this._favoriteHandler = handler;
    
    // Add favorite button event listener
    const favoriteButton = document.getElementById("favorite-button");
    if (favoriteButton) {
      favoriteButton.addEventListener("click", async () => {
        const isCurrentlyFavorite = favoriteButton.classList.contains("active");
        
        // Toggle the active class
        favoriteButton.classList.toggle("active");
        
        // Update the icon and text
        const icon = favoriteButton.querySelector("i");
        if (isCurrentlyFavorite) {
          icon.classList.replace("fas", "far");
          favoriteButton.innerHTML = '';
          favoriteButton.appendChild(icon);
          favoriteButton.appendChild(document.createTextNode(" Add to Favorites"));
        } else {
          icon.classList.replace("far", "fas");
          favoriteButton.innerHTML = '';
          favoriteButton.appendChild(icon);
          favoriteButton.appendChild(document.createTextNode(" Remove from Favorites"));
        }
        
        // Call the handler
        await this._favoriteHandler(!isCurrentlyFavorite);
      });
    }
  }
  
  setShareHandler(handler) {
    this._shareHandler = handler;
    
    // Add share button event listener
    const shareButton = document.getElementById("share-button");
    if (shareButton) {
      shareButton.addEventListener("click", () => {
        this._shareHandler();
      });
    }
  }
  setSaveLocalHandler(handler) {
    this._saveLocalHandler = handler;
    const saveButton = document.getElementById("save-local-button");
    if (saveButton) {
      saveButton.addEventListener("click", () => {
        this._saveLocalHandler();
      });
    }
  }
  cleanup() {
    // Clean up any resources or event listeners
    const backButton = document.getElementById("back-button");
    if (backButton) {
      backButton.replaceWith(backButton.cloneNode(true));
    }

    const likeButton = document.getElementById("like-button");
    if (likeButton) {
      likeButton.replaceWith(likeButton.cloneNode(true));
    }
    
    const favoriteButton = document.getElementById("favorite-button");
    if (favoriteButton) {
      favoriteButton.replaceWith(favoriteButton.cloneNode(true));
    }
    
    const shareButton = document.getElementById("share-button");
    if (shareButton) {
      shareButton.replaceWith(shareButton.cloneNode(true));
    }
    
    // Clean up the map if it exists
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
