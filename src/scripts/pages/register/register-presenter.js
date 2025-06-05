import StoryAPI from "../../data/api";
import AuthHelper from "../../utils/auth-helper";
import PageTransition from "../../utils/page-transition";

export default class RegisterPresenter {
  constructor(view) {
    this._view = view;
    this._isLoading = false;
  }

  async register(name, email, password) {
    // Validate inputs
    if (!name || !email || !password) {
      this._view.showError("Please fill in all required fields");
      return;
    }

    if (password.length < 8) {
      this._view.showError("Password must be at least 8 characters long");
      return;
    }

    try {
      this._isLoading = true;
      this._view.updateRegisterButtonState(
        true,
        '<i class="fas fa-spinner fa-spin icon me-2"></i>Creating your account...'
      );

      // Call the register API
      await StoryAPI.register(name, email, password);

      // Show success message
      this._view.showSuccess("Registration successful! Please login.");

      // Apply success animation with transition
      const formContainer = document.querySelector(".auth-container");
      const successContent = this._getSuccessContent();

      await PageTransition.zoomTransition(formContainer, successContent);
    } catch (error) {
      this._view.showError(
        error.message || "Registration failed. Please try again."
      );
      console.error("Registration error:", error);
    } finally {
      this._isLoading = false;
      this._view.updateRegisterButtonState(
        false,
        '<i class="fas fa-user-plus icon me-2"></i>Create Account'
      );
    }
  }

  isLoading() {
    return this._isLoading;
  }

  _getSuccessContent() {
    return `
      <div class="success-container text-center p-5">
        <div class="mb-4">
          <i class="fas fa-check-circle text-success fa-5x"></i>
        </div>
        <h2 class="mb-3">Registration Successful!</h2>
        <p class="text-muted mb-4">Your account has been created. You can now login to access your account.</p>
        <a href="#/login" class="btn btn-primary btn-lg px-5 py-2">
          <i class="fas fa-sign-in-alt icon me-2"></i>Proceed to Login
        </a>
      </div>
    `;
  }
}
