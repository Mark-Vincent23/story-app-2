// CSS imports
import "../styles/styles.css";
import "../styles/register.css";
import "../styles/theme.css";
import "../styles/pwa.css";
import "../styles/favorites.css";
import "../styles/notification.css";
import "../styles/settings.css";
import "../styles/offline.css";
import "../styles/saved-data.css";

import App from "./pages/app";
import NotificationHelper from "./utils/notification-helper";
import { verifyNotificationSetup } from "./fix-notifications";
import { precacheImportantContent, checkOfflineReady } from "./utils/offline-helper";

document.addEventListener("DOMContentLoaded", async () => {
  const app = new App({
    content: document.querySelector("#main-content"),
    drawerButton: document.querySelector("#drawer-button"),
    navigationDrawer: document.querySelector("#navigation-drawer"),
  });
  await app.renderPage();

  window.addEventListener("hashchange", async () => {
    await app.renderPage();
  });
  
  // Initialize Service Worker for notifications and offline capability
  if ('serviceWorker' in navigator) {
    try {
      const registration = await NotificationHelper.registerServiceWorker();
      if (registration) {
        console.log('Service worker registered successfully');
        
        // Check offline readiness
        const isOfflineReady = await checkOfflineReady();
        console.log('App is ready for offline use:', isOfflineReady);
        
        // Precache important content for offline use
        await precacheImportantContent();
        
        // Verify notification setup
        setTimeout(() => {
          verifyNotificationSetup();
        }, 2000); // Small delay to ensure the page is fully loaded
      }
    } catch (error) {
      console.error('Failed to register service worker:', error);
    }
  }
});
