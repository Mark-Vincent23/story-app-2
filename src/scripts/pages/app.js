import routes from "../routes/routes";
import { getActiveRoute } from "../routes/url-parser";
import AuthHelper from "../utils/auth-helper";
import NotificationHelper from '../utils/notification-helper';
import { activateOfflineMode, deactivateOfflineMode, checkOfflineReady } from '../utils/offline-helper';

// Initialize offline status listeners
function initOfflineStatusListeners() {
  // Check initial network status
  if (!navigator.onLine) {
    activateOfflineMode();
  }
  
  // Add event listeners for online/offline events
  window.addEventListener('online', () => {
    console.log('App is online');
    deactivateOfflineMode();
    // Update UI to show online status
    updateOfflineStatusIndicator(true);
  });
  
  window.addEventListener('offline', () => {
    console.log('App is offline');
    activateOfflineMode();
    // Update UI to show offline status
    updateOfflineStatusIndicator(false);
  });
}

// Update the offline status indicator in the header
function updateOfflineStatusIndicator(isOnline) {
  const header = document.querySelector('.main-header');
  
  // Remove existing indicator if any
  const existingIndicator = document.querySelector('.offline-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  if (!isOnline) {
    // Create and add offline indicator
    const indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
    
    // Insert before the drawer button
    const drawerButton = document.querySelector('#drawer-button');
    if (drawerButton && header) {
      header.insertBefore(indicator, drawerButton);
    }
  }
}

async function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Register the service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered with scope:', registration.scope);
      
      // Request notification permission if needed
      if (registration) {
        try {
          const permission = await NotificationHelper.requestNotificationPermission();
          if (permission) {
            const subscription = await NotificationHelper.subscribeToPushNotification(registration);
            if (subscription) {
              console.log('Successfully subscribed to push notifications');
              
              // Listen for push messages
              setupPushMessageListener();
            }
          }
        } catch (notificationError) {
          console.error('Notification setup error:', notificationError);
          // Don't fail the entire service worker initialization
          NotificationHelper.logNotificationAttempt('init_notification', 'failed', notificationError);
        }
      }
      
      // Setup "Add to Home Screen" detection
      setupInstallPrompt();
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      NotificationHelper.logNotificationAttempt('register_sw', 'failed', error);
    }
  }
}

// Setup listener for push messages
function setupPushMessageListener() {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PUSH_RECEIVED') {
      console.log('Push notification received in client:', event.data);
      
      // Verify the client URL
      if (event.data.notification && event.data.notification.clientUrl) {
        const notificationClientUrl = event.data.notification.clientUrl;
        const currentClientUrl = window.location.origin;
        
        console.log(`Comparing notification client URL (${notificationClientUrl}) with current URL (${currentClientUrl})`);
        
        if (notificationClientUrl !== currentClientUrl) {
          console.warn('WARNING: Notification client URL does not match current URL!');
        } else {
          console.log('Client URL verification successful!');
        }
      }
    }
  });
}

// Handle PWA installation prompt
function setupInstallPrompt() {
  let deferredPrompt;
  
  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent the default prompt
    event.preventDefault();
    
    // Store the event for later use
    deferredPrompt = event;
    
    // Show a custom install button or notification
    showInstallPrompt(deferredPrompt);
  });
  
  // Handle app installed event
  window.addEventListener('appinstalled', (event) => {
    // Clear the deferredPrompt variable
    deferredPrompt = null;
    
    // Hide the install prompt
    hideInstallPrompt();
    
    // Log the installation
    console.log('PWA was installed');
  });
}

function showInstallPrompt(deferredPrompt) {
  // Create the install notification element if it doesn't exist
  if (!document.getElementById('pwa-install-container')) {
    const installContainer = document.createElement('div');
    installContainer.id = 'pwa-install-container';
    installContainer.className = 'pwa-install-prompt';
    installContainer.innerHTML = `
      <div class="install-content">
        <p>Install Story App for offline use</p>
        <div class="install-actions">
          <button id="pwa-install-button" class="install-button">Install</button>
          <button id="pwa-install-dismiss" class="dismiss-button">Not now</button>
        </div>
      </div>
    `;
    
    // Add to the body
    document.body.appendChild(installContainer);
    
    // Add click event to install button
    document.getElementById('pwa-install-button').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      
      // Clear the deferredPrompt variable
      deferredPrompt = null;
      
      // Hide the install prompt
      hideInstallPrompt();
    });
    
    // Add click event to dismiss button
    document.getElementById('pwa-install-dismiss').addEventListener('click', () => {
      hideInstallPrompt();
    });
  }
}

function hideInstallPrompt() {
  const installContainer = document.getElementById('pwa-install-container');
  if (installContainer) {
    installContainer.style.display = 'none';
  }
}


class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #isOffline = !navigator.onLine;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this._setupDrawer();
    this._setupOfflineIndicator();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener("click", () => {
      this.#navigationDrawer.classList.toggle("open");
    });

    // Add logout button event listener
    const logoutButton = this.#navigationDrawer.querySelector("#logout-button");
    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        AuthHelper.logout();
      });
    }

    document.body.addEventListener("click", (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove("open");
      }

      this.#navigationDrawer.querySelectorAll("a").forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove("open");
        }
      });
    });
  }
  
  _setupOfflineIndicator() {
    // Initial check and setup
    updateOfflineStatusIndicator(navigator.onLine);
    
    // Add offline status indicator to the drawer as well
    const navList = this.#navigationDrawer.querySelector('#nav-list');
    if (navList) {
      const offlineStatusItem = document.createElement('li');
      offlineStatusItem.className = 'offline-status-wrapper';
      offlineStatusItem.innerHTML = `
        <div class="offline-status-item">
          <span class="offline-status available" id="offline-status-indicator">
            <i class="fas fa-wifi"></i> Online
          </span>
        </div>
      `;
      navList.appendChild(offlineStatusItem);
      
      // Update the indicator based on current status
      this._updateOfflineStatusText(navigator.onLine);
      
      // Add listeners to update the indicator
      window.addEventListener('online', () => this._updateOfflineStatusText(true));
      window.addEventListener('offline', () => this._updateOfflineStatusText(false));
    }
  }
  
  _updateOfflineStatusText(isOnline) {
    const indicator = document.getElementById('offline-status-indicator');
    if (indicator) {
      if (isOnline) {
        indicator.className = 'offline-status available';
        indicator.innerHTML = '<i class="fas fa-wifi"></i> Online';
      } else {
        indicator.className = 'offline-status unavailable';
        indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
      }
    }
    // Update the class state
    this.#isOffline = !isOnline;
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url];

    // Call cleanup on the previous page if it exists
    if (this.currentPage && typeof this.currentPage.cleanup === "function") {
      await this.currentPage.cleanup();
    }

    if (!page) {
      this.#content.innerHTML = `
        <div class="container error-page">
          <h2>404 - Page Not Found</h2>
          <p>The page you're looking for doesn't exist.</p>
          <a href="#/" class="back-button">Back to Home</a>
        </div>
      `;
      return;
    }

    try {
      // Clear any previous content
      this.#content.innerHTML = "";

      // Render the new page content
      this.#content.innerHTML = await page.render();

      // Execute any JavaScript after rendering
      await page.afterRender();

      // Store the current page for cleanup later
      this.currentPage = page;
    } catch (error) {
      console.error("Error rendering page:", error);
      this.#content.innerHTML = `
        <div class="container error-page">
          <h2>Error</h2>
          <p>${error.message}</p>
          <a href="#/" class="back-button">Back to Home</a>
        </div>
      `;
    }
  }
  
}
initServiceWorker();
initOfflineStatusListeners();
export default App;
