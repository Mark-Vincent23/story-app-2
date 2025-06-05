import CONFIG from '../config';

class AuthHelper {
  static TOKEN_KEY = 'auth_token';
  static USER_INFO_KEY = 'user_info';

  static setAuthToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static removeAuthToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static isUserLoggedIn() {
    return !!this.getToken();
  }

  static logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_INFO_KEY);
    // Redirect to login page after logout
    window.location.hash = '#/login';
  }
  
  static setUserInfo(userInfo) {
    if (userInfo) {
      localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
    }
  }
  
  static getUserInfo() {
    const userInfoStr = localStorage.getItem(this.USER_INFO_KEY);
    if (userInfoStr) {
      try {
        return JSON.parse(userInfoStr);
      } catch (e) {
        console.error('Error parsing user info from localStorage:', e);
        return null;
      }
    }
    return null;
  }
}


export default AuthHelper;
