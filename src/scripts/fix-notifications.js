/**
 * This script updates the Service Worker to properly handle notifications
 * with client URL verification.
 */

// Listen for messages from service worker
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PUSH_RECEIVED') {
    console.log('Received push notification in client:', event.data.notification);
    
    // Check if the client URL matches this website
    if (event.data.notification.clientUrl) {
      const notificationUrl = event.data.notification.clientUrl;
      const currentUrl = window.location.origin;
      
      console.log(`Comparing notification URL: ${notificationUrl} with current URL: ${currentUrl}`);
      
      if (notificationUrl !== currentUrl) {
        console.warn('Notification URL does not match current URL!');
      } else {
        console.log('Notification URL matches current URL ✓');
      }
    }
    
    // Show an alert if the user is on the settings page
    if (window.location.hash === '#/settings') {
      const timestamp = new Date(event.data.notification.receivedAt).toLocaleTimeString();
      alert(`Push notification received at ${timestamp}!\nTitle: ${event.data.notification.title}\nClient URL: ${event.data.notification.clientUrl || 'Not provided'}`);
    }
  }
});

// Setup function to verify notification URL is correctly set
async function verifyNotificationSetup() {
  try {
    // Ensure service worker is registered
    if (!('serviceWorker' in navigator)) {
      console.error('Service Worker not supported in this browser');
      return false;
    }
    
    // Check for existing service worker
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.error('No Service Worker registration found');
      return false;
    }
    
    // Check subscription status
    let subscription;
    try {
      subscription = await registration.pushManager.getSubscription();
    } catch (subError) {
      console.error('Error getting push subscription:', subError);
    }
    
    if (!subscription) {
      console.log('No push subscription found. Creating one...');
      
      // Import NotificationHelper
      const { default: NotificationHelper } = await import('./utils/notification-helper.js');
      
      // Request notification permission if needed
      if (Notification.permission !== 'granted') {
        const permissionGranted = await NotificationHelper.requestNotificationPermission();
        if (!permissionGranted) {
          console.error('Notification permission denied');
          return false;
        }
      }
      
      try {
        // Create subscription
        const newSubscription = await NotificationHelper.subscribeToPushNotification(registration);
        if (!newSubscription) {
          console.error('Failed to create push subscription');
          return false;
        }
        
        console.log('Successfully created push subscription');
      } catch (error) {
        console.error('Error creating push subscription:', error);
        if (error.message && error.message.includes('VAPID key')) {
          console.warn('VAPID key error detected. Attempting to fix...');
          
          // Try to repair the notification system
          const { default: NotificationTroubleshooter } = await import('./utils/notification-troubleshooter.js');
          const repairResult = await NotificationTroubleshooter.repairNotificationSystem();
          console.log('Repair result:', repairResult);
        }
        return false;
      }
    } else {
      console.log('Existing push subscription found');
      
      // Send subscription to server to ensure it's up to date
      try {
        const { default: NotificationHelper } = await import('./utils/notification-helper.js');
        const sent = await NotificationHelper.sendSubscriptionToServer(subscription);
        
        if (sent) {
          console.log('Successfully sent existing subscription to server');
        } else {
          console.warn('Failed to send existing subscription to server');
        }
      } catch (error) {
        console.error('Error sending subscription to server:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying notification setup:', error);
    return false;
  }
}

// Run verification when page loads
window.addEventListener('load', () => {
  // Wait for service worker to be ready
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(() => {
      verifyNotificationSetup();
    });
  }
});

export { verifyNotificationSetup };
