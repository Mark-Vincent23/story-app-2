import { showFormattedDate } from "../../utils/index";
import StoryAPI from "../../data/api";
import AuthHelper from "../../utils/auth-helper";
import PageTransition from "../../utils/page-transition";
import MapHelper from "../../utils/map-helper";
import DetailPresenter from "./detail-presenter";
import DetailView from "./detail-view";

export default class DetailPage {
  constructor() {
    this._view = new DetailView();
    this._presenter = new DetailPresenter({
      model: StoryAPI,
      view: this._view,
    });
  }

  async render() {
    return this._view.render();
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
  async cleanup() {
    this._presenter.cleanup();
  }
}
