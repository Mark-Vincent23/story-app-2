import StoryAPI from "../../data/api";
import AuthHelper from "../../utils/auth-helper";
import PageTransition from "../../utils/page-transition";
import LoginPresenter from "./login-presenter";

export default class LoginPage {
  constructor() {
    this._isLoading = false;
    this._presenter = new LoginPresenter(this);
  }

  async render() {
    if (AuthHelper.isUserLoggedIn()) {
      return `
        <section class="container auth-container">
          <div id="skip-content" class="visually-hidden" tabindex="-1"></div>
          <div class="card auth-message">
            <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
            <h2>You are already logged in!</h2>
            <p>You can continue to browse stories or add your own.</p>
            <div class="d-flex justify-content-center mt-4">
              <a href="#/" class="btn btn-primary mr-2">
                <i class="fas fa-home icon"></i>Home
              </a>
              <a href="#/add" class="btn btn-outline">
                <i class="fas fa-plus icon"></i>Add Story
              </a>
            </div>
          </div>
        </section>
      `;
    }

    return `
      <section class="container auth-container">
        <div id="skip-content" class="visually-hidden" tabindex="-1"></div>
        <h1 class="auth-title"><i class="fas fa-sign-in-alt icon"></i>Login</h1>
        
        <form id="login-form" class="card p-4">
          <div class="form-group">
            <label for="email" class="form-label">
              <i class="fas fa-envelope icon"></i>Email
            </label>
            <input type="email" id="email" name="email" class="form-control" required>
          </div>
          
          <div class="form-group">
            <label for="password" class="form-label">
              <i class="fas fa-lock icon"></i>Password
            </label>
            <input type="password" id="password" name="password" class="form-control" required>
          </div>
          
          <div id="error-message" class="alert alert-danger" style="display: none;"></div>
          
          <div class="form-group">
            <button type="submit" id="login-button" class="btn btn-primary btn-block">
              <i class="fas fa-sign-in-alt icon"></i>Login
            </button>
          </div>
          
          <p class="text-center mt-3">
            Don't have an account? <a href="#/register">Register here</a>
          </p>
        </form>
        
        <div class="card mt-4 p-3">
          <div class="d-flex align-items-center">
            <i class="fas fa-info-circle text-primary mr-2"></i>
            <p class="mb-0">Share your stories and adventures with the world!</p>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this._presenter.init();
  }

  showLoading(button) {
    button.innerHTML =
      '<i class="fas fa-spinner fa-spin icon"></i>Logging in...';
    button.disabled = true;
  }

  hideLoading(button) {
    button.innerHTML = '<i class="fas fa-sign-in-alt icon"></i>Login';
    button.disabled = false;
  }

  showSuccessMessage() {
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) {
      errorMessage.className = "alert alert-success";
      errorMessage.innerHTML =
        '<i class="fas fa-check-circle icon"></i>Login successful! Redirecting...';
      errorMessage.style.display = "block";
    }
  }

  getSuccessContent() {
    return `
      <div class="success-container text-center p-5">
        <i class="fas fa-check-circle text-success fa-5x mb-4"></i>
        <h2>Login Successful!</h2>
        <p>Welcome back to Story App.</p>
        <div class="loading-indicator mt-3">
          <span class="spinner"></span> Redirecting...
        </div>
      </div>
    `;
  }

  _showError(message) {
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) {
      errorMessage.innerHTML = `<i class="fas fa-exclamation-circle icon"></i>${message}`;
      errorMessage.style.display = "block";
      errorMessage.className = "alert alert-danger";
    }
  }
}
