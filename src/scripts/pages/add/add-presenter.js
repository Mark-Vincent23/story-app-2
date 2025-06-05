import StoryAPI from "../../data/api";
import AuthHelper from "../../utils/auth-helper";
import NotificationHelper from "../../utils/notification-helper";
import { addStory } from '../../utils/indexeddb-helper';

export default class AddPresenter {
  constructor({ view, storyApi = StoryAPI }) {
    this._view = view;
    this._storyApi = storyApi;
  }

  async init() {
    if (!AuthHelper.isUserLoggedIn()) {
      this._view.showAuthenticationRequired();
      return;
    }

    await this._view.initializeComponents();
  }

  async submitStory({ description, photo, lat, lon }) {
    try {
      // Validate inputs
      this._validateInputs(description, photo);

      // Show loading state
      this._view.showLoading();

      // Prepare location data if available
      const locationData = {};
      if (lat && lon) {
        locationData.lat = lat;
        locationData.lon = lon;
      }

      // Simpan ke IndexedDB
      await addStory({
        title: description.substring(0, 30),
        description,
        photo,
        ...locationData,
        createdAt: new Date().toISOString(),
      });

      // Submit the story (jika online)
      const response = await this._storyApi.addNewStory({
        description,
        photo,
        ...locationData,
      });

      // Send notification about story creation
      await NotificationHelper.sendStoryCreatedNotification(description);

      // Show success message
      this._view.showSuccess();

      // Navigate to home after delay
      setTimeout(() => {
        window.location.hash = "#/";
      }, 3000);
    } catch (error) {
      console.error("Error submitting story:", error);
      this._view.showError(error.message);
    }
  }

  _validateInputs(description, photo) {
    if (!description || description.trim() === "") {
      throw new Error("Description is required");
    }

    if (!photo) {
      throw new Error("Photo is required");
    }
  }

  updateSubmitButtonState(hasDescription, hasPhoto, hasLocation) {
    // Enable submit button only if we have both description and photo
    // Location is optional
    const isValid = hasDescription && hasPhoto;
    this._view.updateSubmitButtonState(isValid);
  }

  async capturePhoto(cameraPreview, cameraCanvas) {
    if (!cameraPreview || !cameraCanvas) {
      throw new Error("Camera elements not found");
    }

    // Capture the current frame from the video
    const context = cameraCanvas.getContext("2d");
    cameraCanvas.width = cameraPreview.videoWidth;
    cameraCanvas.height = cameraPreview.videoHeight;
    context.drawImage(
      cameraPreview,
      0,
      0,
      cameraCanvas.width,
      cameraCanvas.height
    );

    // Convert the canvas to an image URL
    const imageUrl = cameraCanvas.toDataURL("image/jpeg");
    return imageUrl;
  }

  async getPhotoBlob(dataUrl) {
    const response = await fetch(dataUrl);
    return await response.blob();
  }

  handleLocationSelection(lat, lng) {
    return { lat, lng };
  }

  cleanup() {
    this._view.cleanup();
  }
}
