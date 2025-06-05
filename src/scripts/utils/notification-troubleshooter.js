import NotificationHelper from './notification-helper.js';

class NotificationTroubleshooter {
  static async fixCommonIssues() {
    const issues = {
      fixed: [],
      stillPresent: [],
      status: 'incomplete'
    };
    
    try {
      // 1. Check if Service Worker is properly registered
      const swStatus = await NotificationHelper.checkServiceWorkerStatus();
      
      if (!swStatus.active) {
        console.log('Attempting to register Service Worker...');
        const registration = await NotificationHelper.registerServiceWorker();
        
        if (registration) {
          issues.fixed.push('Service Worker was not registered - now registered');
        } else {
          issues.stillPresent.push('Could not register Service Worker');
        }
      }
      
      // 2. Check for stale subscriptions
      const subStatus = await NotificationHelper.getSubscriptionStatus();
      
      if (subStatus.subscription && Notification.permission === 'granted') {
        try {
          // Try to refresh the subscription
          console.log('Attempting to refresh push subscription...');
          await NotificationHelper.unsubscribeFromPushNotification();
          
          const registration = await navigator.serviceWorker.ready;
          const newSubscription = await NotificationHelper.subscribeToPushNotification(registration);
          
          if (newSubscription) {
            issues.fixed.push('Refreshed push notification subscription');
          }
        } catch (error) {
          console.error('Error refreshing subscription:', error);
          issues.stillPresent.push(`Subscription refresh failed: ${error.message}`);
        }
      }
      
      // 3. Check for invalid VAPID key format
      try {
        const vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
        NotificationHelper._urlBase64ToUint8Array(vapidPublicKey);
      } catch (error) {
        issues.stillPresent.push(`Invalid VAPID key format: ${error.message}`);
      }
      
      // 4. Clear any error logs to start fresh
      localStorage.removeItem('notification_error_log');
      issues.fixed.push('Cleared previous error logs');
      
      // Set final status
      if (issues.stillPresent.length === 0) {
        issues.status = 'success';
      } else if (issues.fixed.length > 0) {
        issues.status = 'partial';
      } else {
        issues.status = 'failed';
      }
      
      // Log the result
      NotificationHelper.logNotificationAttempt(
        'fix_common_issues', 
        issues.status,
        issues.stillPresent.length > 0 ? { message: issues.stillPresent.join(', ') } : null
      );
      
      return issues;
    } catch (error) {
      console.error('Error in fixCommonIssues:', error);
      issues.status = 'error';
      issues.error = error.message;
      return issues;
    }
  }
  
  static async showFixResults(results) {
    let message = 'Notification System Repair Results\n\n';
    
    if (results.status === 'success') {
      message += '✅ All issues were successfully fixed!\n\n';
    } else if (results.status === 'partial') {
      message += '⚠️ Some issues were fixed, but others remain.\n\n';
    } else if (results.status === 'failed') {
      message += '❌ Could not fix the notification issues.\n\n';
    } else {
      message += '❌ An error occurred while trying to fix issues.\n\n';
    }
    
    if (results.fixed.length > 0) {
      message += 'Issues fixed:\n';
      results.fixed.forEach((item, index) => {
        message += `${index + 1}. ✅ ${item}\n`;
      });
      message += '\n';
    }
    
    if (results.stillPresent.length > 0) {
      message += 'Issues that could not be fixed:\n';
      results.stillPresent.forEach((item, index) => {
        message += `${index + 1}. ❌ ${item}\n`;
      });
      message += '\n';
    }
    
    message += 'What would you like to do next?\n';
    message += '1. Try subscribing to notifications again\n';
    message += '2. View detailed troubleshooting guide\n';
    message += '3. Close this message\n';
    
    const choice = prompt(message, '1');
    
    if (choice === '1') {
      // Try subscribing again
      try {
        const status = await NotificationHelper.getSubscriptionStatus();
        if (status.subscribed) {
          await NotificationHelper.unsubscribeFromPushNotification();
        }
        
        if (Notification.permission !== 'granted') {
          const permissionGranted = await NotificationHelper.requestNotificationPermission();
          if (!permissionGranted) {
            alert('Notification permission was not granted. Cannot subscribe.');
            return;
          }
        }
        
        const registration = await navigator.serviceWorker.ready;
        const subscription = await NotificationHelper.subscribeToPushNotification(registration);
        
        if (subscription) {
          alert('Successfully subscribed to notifications!');
        } else {
          alert('Failed to subscribe to notifications. Please try the troubleshooting guide.');
        }
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    } else if (choice === '2') {
      // Show detailed troubleshooting
      await NotificationHelper.showTroubleshootingGuide();
    }
  }
  
  static async repairNotificationSystem() {
    const results = await this.fixCommonIssues();
    await this.showFixResults(results);
    return results;
  }
}

export default NotificationTroubleshooter;
