import StoryAPI from "../../data/api";
import AuthHelper from "../../utils/auth-helper";
import PageTransition from "../../utils/page-transition";
import RegisterPresenter from "./register-presenter";

export default class RegisterPage {
  constructor() {
    this._presenter = new RegisterPresenter(this);
  }

  async render() {
    if (AuthHelper.isUserLoggedIn()) {
      return `
        <section class="container auth-container my-5">
          <div id="skip-content" class="visually-hidden" tabindex="-1"></div>
          <div class="card auth-message shadow-sm border-0 p-4">
            <div class="text-center">
              <i class="fas fa-info-circle text-primary fa-4x mb-3"></i>
              <h2 class="mb-3">You are already logged in!</h2>
              <p class="text-muted mb-4">You need to log out first before creating a new account.</p>
              <div class="d-flex justify-content-center mt-4 gap-3">
                <a href="#/" class="btn btn-primary px-4">
                  <i class="fas fa-home icon me-2"></i>Home
                </a>
                <button id="logout-button" class="btn btn-outline-secondary px-4">
                  <i class="fas fa-sign-out-alt icon me-2"></i>Logout
                </button>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    return `
      <section class="container auth-container my-5">
        <div id="skip-content" class="visually-hidden" tabindex="-1"></div>
        <div class="row justify-content-center">
          <div class="col-md-8 col-lg-6">
            <h1 class="auth-title text-center mb-4">
              <i class="fas fa-user-plus icon me-2"></i>Create Account
            </h1>
            
            <form id="register-form" class="card shadow-sm border-0 p-4 mb-4">
              <div class="form-group mb-3">
                <label for="name" class="form-label fw-bold">
                  <i class="fas fa-user icon me-2"></i>Name
                </label>
                <input type="text" id="name" name="name" class="form-control form-control-lg" 
                  placeholder="Enter your full name" required>
              </div>
              
              <div class="form-group mb-3">
                <label for="email" class="form-label fw-bold">
                  <i class="fas fa-envelope icon me-2"></i>Email
                </label>
                <input type="email" id="email" name="email" class="form-control form-control-lg" 
                  placeholder="Enter your email address" required>
              </div>
              
              <div class="form-group mb-4">
                <label for="password" class="form-label fw-bold">
                  <i class="fas fa-lock icon me-2"></i>Password
                </label>
                <input type="password" id="password" name="password" class="form-control form-control-lg" 
                  placeholder="Create a secure password" required>
                <small class="form-text text-muted mt-2">
                  <i class="fas fa-info-circle me-1"></i>Password must be at least 8 characters long
                </small>
              </div>
              
              <div id="error-message" class="alert alert-danger mb-4" style="display: none;"></div>
              
              <div class="form-group">
                <button type="submit" id="register-button" class="btn btn-primary btn-lg w-100 py-2">
                  <i class="fas fa-user-plus icon me-2"></i>Create Account
                </button>
              </div>
              
              <p class="text-center mt-4 mb-0">
                Already have an account? <a href="#/login" class="text-decoration-none fw-bold">Login here</a>
              </p>
            </form>
            
            <div class="card shadow-sm border-0 mt-4 p-3 bg-light">
              <div class="d-flex align-items-center">
                <i class="fas fa-shield-alt text-primary fa-2x me-3"></i>
                <p class="mb-0">Your data is secure with us. We never share your information with third parties.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    if (AuthHelper.isUserLoggedIn()) {
      const logoutButton = document.getElementById("logout-button");
      if (logoutButton) {
        logoutButton.addEventListener("click", () => {
          AuthHelper.clearAuthToken();
          window.location.reload();
        });
      }
      return;
    }

    this._initRegisterForm();
  }

  _initRegisterForm() {
    const form = document.getElementById("register-form");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (this._presenter.isLoading()) return;

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      await this._presenter.register(name, email, password);
    });
  }

  showError(message) {
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) {
      errorMessage.innerHTML = `<i class="fas fa-exclamation-circle icon me-2"></i>${message}`;
      errorMessage.style.display = "block";
      errorMessage.className = "alert alert-danger";

      // Apply error animation
      errorMessage.classList.add("shake-animation");
      setTimeout(() => {
        errorMessage.classList.remove("shake-animation");
      }, 500);

      // Ensure the error message is visible
      errorMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  showSuccess(message) {
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) {
      errorMessage.className = "alert alert-success";
      errorMessage.innerHTML = `<i class="fas fa-check-circle icon me-2"></i>${message}`;
      errorMessage.style.display = "block";
    }
  }

  updateRegisterButtonState(isLoading, html) {
    const registerButton = document.getElementById("register-button");
    if (registerButton) {
      registerButton.innerHTML = html;
      registerButton.disabled = isLoading;
    }
  }
}
