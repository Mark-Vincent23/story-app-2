const CACHE_NAME = 'story-app-v2';
const STATIC_CACHE = 'story-app-static-v2';
const DYNAMIC_CACHE = 'story-app-dynamic-v2';
const ASSETS_CACHE = 'story-app-assets-v2';
const API_CACHE = 'story-app-api-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.png',
  '/manifest.json',
  '/images/logo.png',
  '/images/logo-72x72.png',
  '/images/logo-96x96.png',
  '/images/logo-128x128.png',
  '/images/logo-144x144.png',
  '/images/logo-152x152.png',
  '/images/logo-192x192.png',
  '/images/logo-384x384.png',
  '/images/logo-512x512.png',
  '/images/offline-image.png',
  '/app.bundle.js',
];


// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing');

  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      for (const url of STATIC_ASSETS) {
        try {
          await cache.add(url);
        } catch (err) {
          console.warn('Service Worker: Failed to cache', url, err);
        }
      }
      // Create empty caches for dynamic content
      await caches.open(DYNAMIC_CACHE);
      await caches.open(ASSETS_CACHE);
      await caches.open(API_CACHE);
      console.log('Service Worker: Install completed');
      return self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating');
  
  // List of current caches to keep
  const currentCaches = [
    STATIC_CACHE,
    DYNAMIC_CACHE,
    ASSETS_CACHE,
    API_CACHE
  ];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((cacheName) => {
            // Delete any cache not in our current list
            return !currentCaches.includes(cacheName);
          }).map((cacheName) => {
            console.log(`Service Worker: Deleting old cache ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activate completed');
        return self.clients.claim();
      })
  );
});

// Helper function to determine which cache to use for a request
function getCache(request) {
  const url = new URL(request.url);
  
  // API requests
  if (url.pathname.startsWith('/v1')) {
    return API_CACHE;
  }
  
  // Static assets (CSS, JS, HTML)
  if (
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname.endsWith('.html') ||
    url.pathname === '/' ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    return STATIC_CACHE;
  }
  
  // Images, fonts, and other media assets
  if (
    url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|eot)$/)
  ) {
    return ASSETS_CACHE;
  }
  
  // Dynamic content (everything else)
  return DYNAMIC_CACHE;
}

// Function to determine if the response should be cached
function shouldCache(response) {
  // Only cache successful responses
  return response && response.status === 200;
}

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Try network first
      fetch(event.request)
        .then((response) => {
          // Cache a copy of the response
          const responseToCache = response.clone();
          caches.open(STATIC_CACHE)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/offline.html');
            });
        })
    );
    return;
  }
  
  // Skip cross-origin requests
  if (requestUrl.origin !== location.origin) {
    return;
  }
  
  // API requests - network first, then cache
  if (requestUrl.pathname.startsWith('/v1')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before consuming it
          const responseToCache = response.clone();
          
          if (shouldCache(response)) {
            caches.open(API_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('Service Worker: Cached API response', requestUrl.pathname);
              });
          }
          
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || new Response(JSON.stringify({
                error: true,
                message: 'No internet connection. Please try again when you are online.'
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }
  
  // For all other requests - use a stale-while-revalidate strategy
  // This means we serve from cache first (if available) while updating the cache in the background
  event.respondWith(
    caches.open(getCache(event.request))
      .then((cache) => {
        return cache.match(event.request)
          .then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
              .then((networkResponse) => {
                // Cache the updated response for future
                if (shouldCache(networkResponse)) {
                  cache.put(event.request, networkResponse.clone());
                  console.log('Service Worker: Updated cache for', event.request.url);
                }
                return networkResponse;
              })
              .catch((error) => {
                console.error('Service Worker: Fetch failed', error);
                
                // For image requests, return a default offline image
                if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
                  return caches.match('/images/offline-image.png');
                }
                
                // Return a generic response for other resources
                if (event.request.headers.get('accept').includes('application/json')) {
                  return new Response(JSON.stringify({
                    error: true,
                    message: 'You are offline. This content is not available.'
                  }), {
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  });
                }
                
                return new Response('Network error occurred. You are offline.', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({
                    'Content-Type': 'text/plain'
                  })
                });
              });
            
            // Return the cached response if we have one, otherwise wait for the network
            return cachedResponse || fetchPromise;
          });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Service Worker: Pushed');

  let notificationData = {};
  
  try {
    if (event.data) {
      notificationData = JSON.parse(event.data.text());
      console.log('Push notification data received:', notificationData);
    }

    // Check if the notification contains clientUrl and verify it matches current origin
    if (notificationData.clientUrl) {
      const url = new URL(notificationData.clientUrl);
      const currentOrigin = self.location.origin;
      
      console.log(`Verifying client URL: ${url.origin} matches current origin: ${currentOrigin}`);
      
      // If clientUrl doesn't match our origin, log warning but still show notification
      if (url.origin !== currentOrigin) {
        console.warn('Client URL in notification does not match current origin!', {
          notificationUrl: url.origin,
          currentOrigin: currentOrigin
        });
      }
    } else {
      console.warn('No client URL in notification data');
    }

    const title = notificationData.title || 'Story App Notification';
    const options = notificationData.options || {
      body: notificationData.message || 'New notification from Story App',
      icon: '/images/logo-192x192.png',
      badge: '/images/logo-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: notificationData.url || '/#/',
        timestamp: new Date().getTime()
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('Push notification successfully displayed');
          
          // Report back to the main thread that we received a notification
          return self.clients.matchAll()
            .then(clients => {
              if (clients && clients.length) {
                clients.forEach(client => {
                  client.postMessage({
                    type: 'PUSH_RECEIVED',
                    notification: {
                      title,
                      options,
                      receivedAt: new Date().toISOString(),
                      clientUrl: notificationData.clientUrl
                    }
                  });
                });
              }
            });
        })
        .catch(error => {
          console.error('Service Worker: Error showing push notification', error);
        })
    );
  } catch (error) {
    console.error('Service Worker: Error processing push data', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.notification);
  
  // Close the notification
  event.notification.close();
  
  // Get the URL to open from the notification data
  const url = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : '/';
  
  // Focus or open window with the URL
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      const hadWindowToFocus = windowClients.some((windowClient) => {
        if (windowClient.url === url) {
          // Tab is already open, focus it
          windowClient.focus();
          return true;
        }
        return false;
      });

      // If no existing window, open new one
      if (!hadWindowToFocus) {
        clients.openWindow(url);
      }
    })
  );
});

// Message event - handle messages from the client
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    try {
      // Validate the notification data
      const title = event.data.title || 'Story App';
      const options = event.data.options || {};
      
      // Add default icon if not provided
      if (!options.icon) {
        options.icon = '/images/logo-192x192.png';
      }
      
      // Log the attempt
      console.log('Service Worker: Showing notification', { title, options });
      
      self.registration.showNotification(title, options)
        .then(() => {
          console.log('Service Worker: Notification shown successfully');
          // Send success back to client
          if (event.source) {
            event.source.postMessage({
              type: 'NOTIFICATION_RESULT',
              success: true
            });
          }
        })
        .catch(error => {
          console.error('Service Worker: Error showing notification', error);
          // Send detailed error back to client
          if (event.source) {
            event.source.postMessage({
              type: 'NOTIFICATION_ERROR',
              error: error.message || 'Failed to show notification',
              name: error.name,
              timestamp: new Date().toISOString()
            });
          }
        });
    } catch (error) {
      console.error('Service Worker: Error processing notification', error);
      // Send error back to client
      if (event.source) {
        event.source.postMessage({
          type: 'NOTIFICATION_ERROR',
          error: error.message || 'Failed to process notification',
          name: error.name,
          timestamp: new Date().toISOString()
        });
      }
    }
  } else if (event.data && event.data.type === 'CHECK_SW_STATUS') {
    // Respond with service worker status
    if (event.source) {
      event.source.postMessage({
        type: 'SW_STATUS',
        active: true,
        version: 'story-app-v1',
        timestamp: new Date().toISOString()
      });
    }
  }
});
