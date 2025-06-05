import PageTransition from "../../utils/page-transition";
import AuthHelper from "../../utils/auth-helper";
import NotificationHelper from "../../utils/notification-helper";
import CONFIG from "../../config";

class SettingsPage {
  constructor() {
    this.notificationStatus = null;
    this.pushStatus = null;
  }
  
  async render() {
    return `
      <div class="container settings-page">
        <h2 class="page-title">Settings</h2>
        
        <div class="settings-section">
          <h3>User Information</h3>
          <div id="user-info-container">
            <div class="loading-indicator">Loading user information...</div>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Notification Settings</h3>
          <div id="notification-status" class="notification-status">
            <div class="loading-indicator">Checking notification status...</div>
          </div>
          
          <div id="notification-controls" class="notification-controls">
            <!-- Notification controls will be rendered here -->
          </div>
          
          <div id="notification-test" class="notification-test mt-3" style="display: none;">
            <button id="test-notification-btn" class="btn btn-outline-primary">
              Test Notification
            </button>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Application Information</h3>
          <div class="app-info">
            <p><strong>Version:</strong> 2.3.0</p>
            <p><strong>API URL:</strong> ${CONFIG.BASE_URL}</p>
            <p><strong>Client URL:</strong> ${window.location.origin}</p>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Account Actions</h3>
          <button id="logout-button" class="btn btn-danger">Logout</button>
        </div>
      </div>
    `;
  }
  
  async afterRender() {
    // Check if user is logged in
    if (!AuthHelper.isUserLoggedIn()) {
      window.location.hash = "#/login";
      return;
    }
    
    // Start page transition
    PageTransition.start();
    
    // Render user info
    this.renderUserInfo();
    
    // Setup notification status and controls
    this.setupNotificationSection();
    
    // Setup logout button
    document.getElementById('logout-button').addEventListener('click', () => {
      this.handleLogout();
    });
  }
  renderUserInfo() {
    // Get user info from AuthHelper
    const userInfo = AuthHelper.getUserInfo();
    const token = AuthHelper.getToken();
    const userInfoContainer = document.getElementById('user-info-container');
    
    if (userInfo) {
      userInfoContainer.innerHTML = `
        <div class="user-info">
          <p><strong>Name:</strong> ${userInfo.name || 'Not available'}</p>
          <p><strong>Email:</strong> ${userInfo.email || 'Not available'}</p>
          ${userInfo.userId ? `<p><strong>User ID:</strong> ${userInfo.userId}</p>` : ''}
        </div>
      `;
    } else if (token) {
      // Fallback to token info if user info not available
      userInfoContainer.innerHTML = `
        <div class="user-info">
          <p><strong>Status:</strong> Logged In</p>
          <p><strong>Authentication:</strong> Active</p>
          <p><strong>Token:</strong> ${token.substring(0, 10)}...</p>
        </div>
      `;
    } else {
      userInfoContainer.innerHTML = `
        <div class="error-state">
          <p>Could not load user information</p>
        </div>
      `;
    }
  }
  
  async setupNotificationSection() {
    const notificationStatus = document.getElementById('notification-status');
    const notificationControls = document.getElementById('notification-controls');
    const notificationTest = document.getElementById('notification-test');
    
    try {
      // Check if notifications are supported
      if (!NotificationHelper.isNotificationSupported()) {
        notificationStatus.innerHTML = `
          <div class="alert alert-warning">
            Your browser does not support notifications
          </div>
        `;
        return;
      }
      
      // Check Service Worker status
      const swStatus = await NotificationHelper.checkServiceWorkerStatus();
      
      if (!swStatus.active) {
        notificationStatus.innerHTML = `
          <div class="alert alert-warning">
            Service Worker is not active. Notifications may not work properly.
            <button id="fix-sw-btn" class="btn btn-sm btn-outline-primary mt-2">Fix Service Worker</button>
          </div>
        `;
        
        document.getElementById('fix-sw-btn').addEventListener('click', async () => {
          const registration = await NotificationHelper.registerServiceWorker();
          if (registration) {
            alert('Service Worker successfully registered! Please refresh the page.');
          } else {
            alert('Failed to register Service Worker. Please check browser console for errors.');
          }
        });
        
        return;
      }
      
      // Check subscription status
      const subStatus = await NotificationHelper.getSubscriptionStatus();
      this.pushStatus = subStatus;
      
      // Update status display
      this.updateNotificationStatusDisplay();
      
      // Create notification controls
      NotificationHelper.createNotificationToggleButton('notification-controls');
      NotificationHelper.createNewStoriesNotificationToggle('notification-controls');
      
      // Show test button if subscribed
      if (subStatus.subscribed) {
        notificationTest.style.display = 'block';
        document.getElementById('test-notification-btn').addEventListener('click', () => {
          this.testNotification();
        });
      }
      
      // Add a troubleshooter button
      notificationControls.innerHTML += `
        <div class="mt-3">
          <button id="troubleshoot-btn" class="btn btn-outline-secondary btn-sm">
            Troubleshoot Notifications
          </button>
        </div>
      `;
      
      document.getElementById('troubleshoot-btn').addEventListener('click', () => {
        NotificationHelper.showTroubleshootingGuide();
      });
      
    } catch (error) {
      console.error('Error setting up notification section:', error);
      notificationStatus.innerHTML = `
        <div class="alert alert-danger">
          Error checking notification status: ${error.message}
        </div>
      `;
    }
  }
  
  updateNotificationStatusDisplay() {
    const notificationStatus = document.getElementById('notification-status');
    const notificationTest = document.getElementById('notification-test');
    
    if (!this.pushStatus) {
      notificationStatus.innerHTML = `
        <div class="alert alert-warning">
          Could not determine notification status
        </div>
      `;
      return;
    }
    
    if (Notification.permission === 'denied') {
      notificationStatus.innerHTML = `
        <div class="alert alert-danger">
          <strong>Notifications Blocked</strong>
          <p>You have blocked notifications in your browser settings.</p>
          <button id="show-instructions-btn" class="btn btn-sm btn-outline-primary mt-2">
            How to Enable
          </button>
        </div>
      `;
      
      document.getElementById('show-instructions-btn').addEventListener('click', () => {
        NotificationHelper.showPermissionInstructions();
      });
      
      return;
    }
    
    if (this.pushStatus.subscribed) {
      notificationStatus.innerHTML = `
        <div class="alert alert-success">
          <strong>Notifications Enabled</strong>
          <p>You will receive notifications from this application</p>
          <div class="subscription-details mt-2">
            <small>Client URL: ${window.location.origin}</small>
          </div>
        </div>
      `;
      
      notificationTest.style.display = 'block';
    } else {
      notificationStatus.innerHTML = `
        <div class="alert alert-info">
          <strong>Notifications Disabled</strong>
          <p>Enable notifications to receive updates about new stories</p>
        </div>
      `;
      
      notificationTest.style.display = 'none';
    }
  }
    async testNotification() {
    try {
      // Test notification with clientUrl info
      const clientUrl = window.location.origin;
      
      // Add a timestamp to make the notification unique
      const timestamp = new Date().toISOString();
      
      const testData = {
        title: 'Test Notification',
        options: {
          body: `This is a test notification from Story App at ${new Date().toLocaleTimeString()}`,
          icon: '/images/logo-192x192.png',
          badge: '/images/logo-72x72.png',
          data: {
            url: '/#/settings',
            timestamp: Date.now(),
            clientUrl: clientUrl, // Include in data too for redundancy
            testId: `test-${Date.now()}`
          }
        },
        userInitiated: true,
        clientUrl: clientUrl
      };
      
      console.log('Sending test notification with client URL:', clientUrl);
      
      const result = await NotificationHelper.showNotification(testData);
      
      if (result) {
        alert(`Test notification sent successfully! You should see it shortly.\n\nClient URL: ${clientUrl}`);
        
        // Log the test for verification
        NotificationHelper.logNotificationAttempt('test_notification', 'sent', { 
          timestamp,
          clientUrl
        });
      } else {
        alert('Failed to send test notification. Check browser console for errors.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert(`Error sending test notification: ${error.message}`);
    }
  }
  
  handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      AuthHelper.logout();
      window.location.hash = "#/login";
    }
  }
  
  async cleanup() {
    // Remove event listeners if needed
  }
}

export default SettingsPage;