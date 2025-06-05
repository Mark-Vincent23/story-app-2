import AddView from "./add-view";
import AddPresenter from "./add-presenter";
import StoryAPI from "../../data/api";

export default class AddPage {
  constructor() {
    this._view = new AddView();
    this._presenter = new AddPresenter({
      view: this._view,
      storyApi: StoryAPI,
    });
  }

  async render() {
    return this._view.render();
  }

  async afterRender() {
    // Set up event handlers
    this._view.onInputChange = (hasDescription, hasPhoto, hasLocation) => {
      this._presenter.updateSubmitButtonState(
        hasDescription,
        hasPhoto,
        hasLocation
      );
    };

    this._view.onCapturePhoto = async (cameraPreview, cameraCanvas) => {
      return this._presenter.capturePhoto(cameraPreview, cameraCanvas);
    };

    this._view.onLocationSelect = (lat, lng) => {
      return this._presenter.handleLocationSelection(lat, lng);
    };

    // Initialize the presenter
    await this._presenter.init();

    // Set up form submission
    this._view.initFormSubmission((data) => {
      this._presenter.submitStory(data);
    });
  }

  async cleanup() {
    this._presenter.cleanup();
  }
}
