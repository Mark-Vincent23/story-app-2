import AuthHelper from "../../utils/auth-helper";
import MapHelper from "../../utils/map-helper";
import PageTransition from "../../utils/page-transition";

export default class AddView {
  constructor() {
    this._map = null;
    this._selectedLocation = null;
    this._mediaStream = null;
    this._marker = null;
  }

  render() {
    if (!AuthHelper.isUserLoggedIn()) {
      return this._renderAuthRequired();
    }

    return this._renderAddForm();
  }

  _renderAuthRequired() {
    return `
      <section class="container">
        <div id="skip-content" class="visually-hidden" tabindex="-1"></div>
        <div class="card auth-message p-4">
          <h2><i class="fas fa-lock icon"></i>Authentication Required</h2>
          <p>You need to login to add a new story.</p>
          <a href="#/login" class="btn btn-primary mt-3"><i class="fas fa-sign-in-alt icon"></i>Login</a>
        </div>
      </section>
    `;
  }

  _renderAddForm() {
    return `
      <section class="container add-story-container">
        <div id="skip-content" tabindex="-1"></div>
        <h1 class="add-title"><i class="fas fa-plus-circle icon"></i>Add New Story</h1>
        
        <form id="add-story-form" class="add-story-form card">
          <div class="card-body">
            <div class="form-group">
              <label for="description" class="form-label"><i class="fas fa-pen icon"></i>Story Description</label>
              <textarea id="description" name="description" class="form-control" required></textarea>
            </div>
            
            <div class="form-group">
              <label class="form-label"><i class="fas fa-camera icon"></i>Photo</label>
              <div class="camera-container card">
                <video id="camera-preview" class="camera-preview" autoplay></video>
                <canvas id="camera-canvas" class="camera-canvas" style="display: none;"></canvas>
                <div class="camera-controls p-3">
                  <button type="button" id="camera-button" class="btn btn-primary">
                    <i class="fas fa-camera icon"></i>Take Photo
                  </button>
                  <button type="button" id="retake-button" class="btn btn-secondary" style="display: none;">
                    <i class="fas fa-redo icon"></i>Retake
                  </button>
                </div>
              </div>
              <div id="photo-preview" class="photo-preview card p-3" style="display: none;"></div>
            </div>
            
            <div class="form-group">
              <label class="form-label"><i class="fas fa-map-marker-alt icon"></i>Location (Click on the map to select)</label>
              <div id="location-map" class="location-map card"></div>
              <div id="selected-location" class="selected-location mt-2">
                <i class="fas fa-info-circle icon"></i>No location selected
              </div>
            </div>
            
            <div class="form-actions d-flex justify-content-between mt-4">
              <a href="#/" class="btn btn-secondary">
                <i class="fas fa-times icon"></i>Cancel
              </a>
              <button type="submit" id="submit-button" class="btn btn-primary" disabled>
                <i class="fas fa-paper-plane icon"></i>Submit Story
              </button>
            </div>
          </div>
        </form>
      </section>
    `;
  }

  showAuthenticationRequired() {
    const container = document.querySelector(".container");
    if (container) {
      container.innerHTML = this._renderAuthRequired();
    }
  }

  async initializeComponents() {
    await this._initCamera();
    this._initMap();
    this._initDescriptionListener();
  }

  _initDescriptionListener() {
    const descriptionElement = document.getElementById("description");
    if (descriptionElement) {
      descriptionElement.addEventListener("input", () => {
        const hasDescription = descriptionElement.value.trim() !== "";
        const hasPhoto = this._hasPhoto();

        // Notify presenter about state change
        if (this.onInputChange) {
          this.onInputChange(
            hasDescription,
            hasPhoto,
            !!this._selectedLocation
          );
        }
      });
    }
  }

  async _initCamera() {
    const cameraPreview = document.getElementById("camera-preview");
    const cameraButton = document.getElementById("camera-button");
    const retakeButton = document.getElementById("retake-button");
    const photoPreview = document.getElementById("photo-preview");
    const cameraCanvas = document.getElementById("camera-canvas");

    // Check if all elements exist
    if (
      !cameraPreview ||
      !cameraButton ||
      !retakeButton ||
      !photoPreview ||
      !cameraCanvas
    ) {
      console.error("Camera elements not found in the DOM");
      return;
    }

    try {
      this._mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      cameraPreview.srcObject = this._mediaStream;

      cameraButton.addEventListener("click", async () => {
        if (this.onCapturePhoto) {
          const imageUrl = await this.onCapturePhoto(
            cameraPreview,
            cameraCanvas
          );

          // Display the captured image
          photoPreview.innerHTML = `
            <div class="captured-photo-container">
              <img src="${imageUrl}" alt="Captured photo" class="captured-photo">
              <div class="photo-info mt-2">
                <i class="fas fa-check-circle text-success"></i> Photo captured successfully
              </div>
            </div>
          `;
          photoPreview.style.display = "block";
          cameraPreview.style.display = "none";
          cameraButton.style.display = "none";
          retakeButton.style.display = "block";

          // Update state
          const hasDescription =
            document.getElementById("description").value.trim() !== "";
          if (this.onInputChange) {
            this.onInputChange(hasDescription, true, !!this._selectedLocation);
          }
        }
      });

      retakeButton.addEventListener("click", () => {
        // Clear the captured image and show the camera preview again
        photoPreview.innerHTML = "";
        photoPreview.style.display = "none";
        cameraPreview.style.display = "block";
        cameraButton.style.display = "block";
        retakeButton.style.display = "none";

        // Update state
        const hasDescription =
          document.getElementById("description").value.trim() !== "";
        if (this.onInputChange) {
          this.onInputChange(hasDescription, false, !!this._selectedLocation);
        }
      });
    } catch (error) {
      console.error("Error accessing camera:", error);
      this._setupFallbackImageUpload(error);
    }
  }

  _setupFallbackImageUpload(error) {
    const cameraContainer = document.querySelector(".camera-container");
    if (cameraContainer) {
      cameraContainer.innerHTML = `
        <div class="camera-error p-4 text-center">
          <i class="fas fa-exclamation-triangle text-warning fa-2x mb-3"></i>
          <p>Unable to access camera: ${error.message}</p>
          <div class="mt-3">
            <input type="file" id="photo-upload" accept="image/*" capture="environment" class="d-none">
            <label for="photo-upload" class="btn btn-primary">
              <i class="fas fa-upload icon"></i>Upload Photo
            </label>
          </div>
        </div>
      `;

      // Add event listener for file upload as fallback
      const photoUpload = document.getElementById("photo-upload");
      const photoPreview = document.getElementById("photo-preview");

      if (photoUpload && photoPreview) {
        photoUpload.addEventListener("change", (event) => {
          if (event.target.files && event.target.files[0]) {
            const reader = new FileReader();

            reader.onload = (e) => {
              photoPreview.innerHTML = `
                <div class="captured-photo-container">
                  <img src="${e.target.result}" alt="Uploaded photo" class="captured-photo">
                  <div class="photo-info mt-2">
                    <i class="fas fa-check-circle text-success"></i> Photo uploaded successfully
                  </div>
                </div>
              `;
              photoPreview.style.display = "block";

              // Update state
              const hasDescription =
                document.getElementById("description").value.trim() !== "";
              if (this.onInputChange) {
                this.onInputChange(
                  hasDescription,
                  true,
                  !!this._selectedLocation
                );
              }
            };

            reader.readAsDataURL(event.target.files[0]);
          }
        });
      }
    }
  }

  _initMap() {
    // Initialize the map with multiple layer options
    this._map = MapHelper.initMap("location-map", {
      center: [-2.5489, 118.0149], // Center of Indonesia
      zoom: 5,
      defaultLayer: "openStreetMap",
    });

    // Add click event to select location
    this._map.on("click", (event) => {
      // Remove previous marker if exists
      if (this._marker) {
        this._map.removeLayer(this._marker);
      }

      // Get clicked coordinates
      const lat = event.latlng.lat;
      const lng = event.latlng.lng;

      if (this.onLocationSelect) {
        this._selectedLocation = this.onLocationSelect(lat, lng);
      } else {
        this._selectedLocation = { lat, lng };
      }

      // Add marker at clicked location with custom icon
      const locationIcon = MapHelper.createCustomIcon(
        "https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/images/marker-icon.png"
      );
      this._marker = MapHelper.addMarker(this._map, lat, lng, {
        icon: locationIcon,
        popup: "Your story location",
      });

      // Update location display with animation
      const selectedLocationElement =
        document.getElementById("selected-location");
      if (selectedLocationElement) {
        const newContent = `
          <i class="fas fa-map-marker-alt text-danger icon"></i>
          Selected location: ${lat.toFixed(6)}, ${lng.toFixed(6)}
        `;

        // Apply a simple highlight animation
        selectedLocationElement.innerHTML = newContent;
        selectedLocationElement.classList.add("location-selected");

        // Remove the animation class after the animation completes
        setTimeout(() => {
          selectedLocationElement.classList.remove("location-selected");
        }, 1000);
      }

      // Update state
      const hasDescription =
        document.getElementById("description").value.trim() !== "";
      const hasPhoto = this._hasPhoto();
      if (this.onInputChange) {
        this.onInputChange(hasDescription, hasPhoto, true);
      }
    });
  }

  initFormSubmission(submitCallback) {
    const form = document.getElementById("add-story-form");
    if (!form) {
      console.error("Form not found in the DOM");
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const description = document.getElementById("description").value;
      const photoBlob = await this._getPhotoBlob();
      const locationData = this._selectedLocation || {};

      submitCallback({
        description,
        photo: photoBlob,
        lat: locationData.lat,
        lon: locationData.lng,
      });
    });
  }

  async _getPhotoBlob() {
    // Get photo data
    const photoPreview = document.getElementById("photo-preview");

    if (
      photoPreview &&
      photoPreview.style.display !== "none" &&
      photoPreview.querySelector("img")
    ) {
      // If we have a displayed photo in the preview
      const img = photoPreview.querySelector("img");
      const dataUrl = img.src;
      const response = await fetch(dataUrl);
      return await response.blob();
    }

    // Try to get from canvas
    const photoCanvas = document.getElementById("camera-canvas");
    if (photoCanvas && photoCanvas.width > 0) {
      return await new Promise((resolve) => {
        photoCanvas.toBlob(resolve, "image/jpeg");
      });
    }

    // Try to get from file input
    const photoUpload = document.getElementById("photo-upload");
    if (photoUpload && photoUpload.files && photoUpload.files[0]) {
      return photoUpload.files[0];
    }

    return null;
  }

  _hasPhoto() {
    const photoPreview = document.getElementById("photo-preview");
    return (
      photoPreview &&
      photoPreview.style.display !== "none" &&
      photoPreview.innerHTML !== ""
    );
  }

  updateSubmitButtonState(isValid) {
    const submitButton = document.getElementById("submit-button");
    if (!submitButton) return;

    submitButton.disabled = !isValid;

    // Update button appearance based on state
    if (isValid) {
      submitButton.classList.remove("btn-secondary");
      submitButton.classList.add("btn-primary");
    } else {
      submitButton.classList.remove("btn-primary");
      submitButton.classList.add("btn-secondary");
    }
  }

  showLoading() {
    const submitButton = document.getElementById("submit-button");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML =
        '<i class="fas fa-spinner fa-spin icon"></i>Submitting...';
    }
  }

  async showSuccess() {
    const container = document.querySelector(".add-story-container");
    if (!container) return;

    const successMessage = `
      <div class="success-container text-center p-5">
        <i class="fas fa-check-circle text-success fa-5x mb-4"></i>
        <h2>Story added successfully!</h2>
        <p>Your story has been shared with the world.</p>
        <a href="#/" class="btn btn-primary mt-4">
          <i class="fas fa-home icon"></i>Back to Home
        </a>
      </div>
    `;

    await PageTransition.zoomTransition(container, successMessage);
  }

  showError(message) {
    const form = document.getElementById("add-story-form");
    if (!form) return;

    // Reset submit button
    const submitButton = document.getElementById("submit-button");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML =
        '<i class="fas fa-paper-plane icon"></i>Submit Story';
    }

    // Show error message
    const errorAlert = document.createElement("div");
    errorAlert.className = "alert alert-danger mt-3";
    errorAlert.innerHTML = `
         <i class="fas fa-exclamation-circle icon"></i>
         Failed to add story: ${message}
       `;

    // Add error message to form
    form.appendChild(errorAlert);

    // Scroll to error message
    errorAlert.scrollIntoView({ behavior: "smooth" });

    // Remove error message after 5 seconds
    setTimeout(() => {
      errorAlert.remove();
    }, 5000);
  }

  cleanup() {
    // Stop media stream if it exists
    if (this._mediaStream) {
      this._mediaStream.getTracks().forEach((track) => track.stop());
      this._mediaStream = null;
      console.log("Camera stream stopped during cleanup");
    }
  }
}
