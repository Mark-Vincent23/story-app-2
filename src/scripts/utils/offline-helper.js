/**
 * This script enhances offline capability by pre-caching important content
 * and providing a better offline experience.
 */

// Check if the Cache API is supported
const isCacheSupported = 'caches' in window;

// Function to pre-cache important content for offline use
async function precacheImportantContent() {
  if (!isCacheSupported) {
    console.warn('Cache API is not supported in this browser');
    return;
  }

  try {
    // Wait for service worker to be active
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready;
      
      // Check if we're online before trying to precache
      if (!navigator.onLine) {
        console.log('Device is offline, skipping precaching');
        return;
      }
      
      console.log('Precaching important content for offline use...');
      
      // Get the cache for storing dynamic content
      const cache = await caches.open('story-app-dynamic-v2');
      
      // URLs to precache - add important app routes
      const urlsToCache = [
        '/#/',
        '/#/favorites',
        '/#/about',
        '/#/settings'
      ];
      
      // Cache each URL
      const cachePromises = urlsToCache.map(async (url) => {
        try {
          // Convert hash URLs to actual URLs the service worker can cache
          const cacheUrl = url.startsWith('/#/') 
            ? '/' + url.substring(2) 
            : url;
          
          const response = await fetch(cacheUrl, {
            method: 'GET',
            credentials: 'same-origin'
          });
          
          if (response.ok) {
            await cache.put(cacheUrl, response);
            console.log(`Precached: ${url}`);
          }
        } catch (error) {
          console.error(`Failed to precache ${url}:`, error);
        }
      });
      
      await Promise.all(cachePromises);
      console.log('Precaching completed');
    }
  } catch (error) {
    console.error('Error during precaching:', error);
  }
}

// Function to check if app is ready for offline use
async function checkOfflineReady() {
  if (!isCacheSupported) {
    return false;
  }
  
  try {
    // Check if essential caches exist
    const cacheNames = await caches.keys();
    const essentialCaches = [
      'story-app-static-v2',
      'story-app-dynamic-v2'
    ];
    
    // Check if all essential caches exist
    const allCachesExist = essentialCaches.every(cacheName => 
      cacheNames.includes(cacheName)
    );
    
    if (!allCachesExist) {
      console.log('Not all essential caches exist');
      return false;
    }
    
    // Check if static cache has content
    const staticCache = await caches.open('story-app-static-v2');
    const cachedFiles = await staticCache.keys();
    
    return cachedFiles.length > 0;
  } catch (error) {
    console.error('Error checking offline readiness:', error);
    return false;
  }
}

// Listen for online/offline events
window.addEventListener('online', async () => {
  console.log('Device is online');
  // When coming back online, precache important content
  await precacheImportantContent();
  
  // Notify the user
  const event = new CustomEvent('app-online');
  window.dispatchEvent(event);
});

window.addEventListener('offline', () => {
  console.log('Device is offline');
  
  // Notify the user
  const event = new CustomEvent('app-offline');
  window.dispatchEvent(event);
});

// Function to handle offline mode activation
function activateOfflineMode() {
  // Add a class to the body to enable offline styles
  document.body.classList.add('offline-mode');
  
  // Show offline notification if not already showing
  if (!document.querySelector('.offline-notification')) {
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.innerHTML = `
      <div class="offline-notification-content">
        <i class="fas fa-wifi-slash"></i> You are offline. Some features may be limited.
        <button class="offline-close-btn">&times;</button>
      </div>
    `;
    document.body.appendChild(notification);
    
    // Add event listener to close button
    notification.querySelector('.offline-close-btn').addEventListener('click', () => {
      notification.remove();
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.classList.add('offline-hide');
      setTimeout(() => notification.remove(), 1000);
    }, 5000);
  }
}

// Function to deactivate offline mode
function deactivateOfflineMode() {
  document.body.classList.remove('offline-mode');
  
  // Remove offline notification if it exists
  const notification = document.querySelector('.offline-notification');
  if (notification) {
    notification.remove();
  }
}

// Custom event listeners for online/offline
window.addEventListener('app-offline', () => {
  activateOfflineMode();
});

window.addEventListener('app-online', () => {
  deactivateOfflineMode();
});

// Initialize - check network status on load
document.addEventListener('DOMContentLoaded', async () => {
  // Check if browser is offline
  if (!navigator.onLine) {
    activateOfflineMode();
  } else {
    // If online, precache content
    await precacheImportantContent();
  }
  
  // Check if app is ready for offline use
  const isOfflineReady = await checkOfflineReady();
  console.log('App is ready for offline use:', isOfflineReady);
});

export { 
  precacheImportantContent, 
  checkOfflineReady,
  activateOfflineMode,
  deactivateOfflineMode
};
