import StoryAPI from "../../data/api";
import AuthHelper from "../../utils/auth-helper";
import PageTransition from "../../utils/page-transition";

export default class LoginPresenter {
  constructor(view) {
    this._view = view;
    this._storyAPI = StoryAPI;
    this._authHelper = AuthHelper;
    this._isLoading = false;
  }

  async init() {
    if (this._authHelper.isUserLoggedIn()) {
      return;
    }

    this._initLoginForm();
  }

  _initLoginForm() {
    const form = document.getElementById("login-form");
    const loginButton = document.getElementById("login-button");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (this._isLoading) return;

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      // Simple validation
      if (!email || !password) {
        this._view._showError("Please fill in all fields");
        return;
      }

      try {
        this._isLoading = true;
        this._view.showLoading(loginButton);        // Call the login API
        const result = await this._storyAPI.login(email, password);

        // Save auth token
        this._authHelper.setAuthToken(result.token);
        
        // Save user info if available
        if (result.userId || result.name || result.email) {
          this._authHelper.setUserInfo({
            userId: result.userId,
            name: result.name || email.split('@')[0], // Use part of email as name if not provided
            email: result.email || email
          });
        }

        // Show success message and redirect
        await this._handleSuccessfulLogin();
      } catch (error) {
        this._handleLoginError(error);
      } finally {
        this._isLoading = false;
        this._view.hideLoading(loginButton);
      }
    });
  }

  async _handleSuccessfulLogin() {
    // Show success message
    this._view.showSuccessMessage();

    // Apply success animation
    const formContainer = document.querySelector(".auth-container");
    const successContent = this._view.getSuccessContent();

    await PageTransition.zoomTransition(formContainer, successContent);

    // Redirect to home page
    setTimeout(() => {
      window.location.hash = "#/";
    }, 1500);
  }

  _handleLoginError(error) {
    const errorMessage =
      error.message || "Login failed. Please check your credentials.";
    this._view._showError(errorMessage);
    console.error("Login error:", error);

    // Apply error animation
    const errorElement = document.getElementById("error-message");
    if (errorElement) {
      errorElement.classList.add("shake-animation");
      setTimeout(() => {
        errorElement.classList.remove("shake-animation");
      }, 500);
    }
  }
}
