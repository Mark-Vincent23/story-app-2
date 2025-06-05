class NotificationHelper {    static async registerServiceWorker() {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered with scope:', registration.scope);
          return registration;
        } catch (error) {
          console.error('Service Worker registration failed:', error);
          // Store the error for diagnostics
          this.logNotificationAttempt('register_sw', 'failed', error);
          return null;
        }
      }
      console.warn('Service Worker not supported in this browser');
      return null;
    }
    
    static async checkServiceWorkerStatus() {
      if (!('serviceWorker' in navigator)) {
        return {
          supported: false,
          active: false,
          message: 'Service Worker not supported in this browser'
        };
      }
      
      try {
        // Check if service worker is registered
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          return {
            supported: true,
            active: false,
            message: 'Service Worker not registered'
          };
        }
        
        // Check service worker state
        const sw = registration.active || registration.installing || registration.waiting;
        
        if (!sw) {
          return {
            supported: true,
            active: false,
            registered: true,
            message: 'Service Worker registered but not active'
          };
        }
        
        // If we have an active service worker, ping it to check status
        if (navigator.serviceWorker.controller) {
          try {
            // Set up a promise that will resolve when we get a response
            const messagePromise = new Promise((resolve) => {
              const messageHandler = (event) => {
                if (event.data && event.data.type === 'SW_STATUS') {
                  navigator.serviceWorker.removeEventListener('message', messageHandler);
                  resolve(event.data);
                }
              };
              
              navigator.serviceWorker.addEventListener('message', messageHandler);
              
              // Set a timeout in case we don't get a response
              setTimeout(() => {
                navigator.serviceWorker.removeEventListener('message', messageHandler);
                resolve({ type: 'SW_STATUS', timedOut: true });
              }, 3000);
            });
            
            // Send the message to the service worker
            navigator.serviceWorker.controller.postMessage({
              type: 'CHECK_SW_STATUS'
            });
            
            // Wait for response
            const response = await messagePromise;
            
            if (response.timedOut) {
              return {
                supported: true,
                active: true,
                responsive: false,
                message: 'Service Worker not responding to messages'
              };
            }
            
            return {
              supported: true,
              active: true,
              responsive: true,
              version: response.version,
              message: 'Service Worker active and responsive'
            };
          } catch (error) {
            return {
              supported: true,
              active: true,
              responsive: false,
              error: error.message,
              message: 'Error communicating with Service Worker'
            };
          }
        }
        
        return {
          supported: true,
          active: true,
          state: sw.state,
          message: `Service Worker in ${sw.state} state`
        };
      } catch (error) {
        return {
          supported: true,
          error: error.message,
          message: 'Error checking Service Worker status'
        };
      }
    }
  
  static async requestNotificationPermission() {
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
      }
  
      try {
        // Check current permission before requesting
        if (Notification.permission === 'denied') {
          console.warn('Notification permission was previously denied');
          // Show guidance to the user on how to enable notifications
          this.showPermissionInstructions();
          return false;
        }
        
        const permission = await Notification.requestPermission();
        
        // If denied, show instructions
        if (permission === 'denied') {
          console.warn('User denied notification permission');
          this.showPermissionInstructions();
        }
        
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    
    static showPermissionInstructions() {
      // Create a modal or alert with instructions
      const message = `
        Notification permission was denied. To enable notifications:
        
        1. Click the lock/info icon in your browser's address bar
        2. Find "Notifications" permission
        3. Change it to "Allow"
        4. Refresh the page
      `;
      
      alert(message);
    }    static async subscribeToPushNotification(registration) {
      try {
        // First, check notification permission
        if (Notification.permission !== 'granted') {
          console.error('Notification permission not granted');
          return null;
        }
        
        // Check if we have a valid registration
        if (!registration || typeof registration.pushManager !== 'object') {
          console.error('Invalid service worker registration', registration);
          throw new Error('Invalid service worker registration');
        }
          const vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
        
        try {
          // Ensure the key is properly formatted before converting
          if (!vapidPublicKey || typeof vapidPublicKey !== 'string' || vapidPublicKey.length < 20) {
            console.error('Invalid VAPID key format: Key is too short or not a string');
            throw new Error('Invalid VAPID key format: Key is too short or not a string');
          }
          
          const convertedVapidKey = this._urlBase64ToUint8Array(vapidPublicKey);
          console.log('Converted VAPID key successfully:', convertedVapidKey.length, 'bytes');
          
          // Try to subscribe with error handling
          try {
            console.log('Attempting to subscribe with PushManager...');
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey,
            });
            
            if (!subscription) {
              console.error('Subscription returned null/undefined');
              throw new Error('Subscription creation failed');
            }
            
            console.log('Push notification subscription successful:', subscription);
            
            // Send subscription to server
            const sentToServer = await this.sendSubscriptionToServer(subscription);
            if (sentToServer) {
              console.log('Subscription successfully sent to server');
            } else {
              console.warn('Failed to send subscription to server');
            }
            
            // Store subscription status in localStorage
            localStorage.setItem('notification_subscribed', 'true');
            
            return subscription;
          } catch (subscribeError) {
            // Handle specific subscription errors
            console.error('Subscribe error details:', {
              name: subscribeError.name,
              message: subscribeError.message,
              stack: subscribeError.stack
            });
            
            if (subscribeError.name === 'NotAllowedError') {
              console.error('Push subscription failed: Permission denied by user or system');
              this.showPermissionInstructions();
            } else if (subscribeError.name === 'InvalidStateError') {
              console.error('Push subscription failed: Service Worker is in an invalid state');
            } else if (subscribeError.message && subscribeError.message.includes('permission')) {
              console.error('Push subscription failed: Permission issue', subscribeError);
              this.showPermissionInstructions();
            } else if (subscribeError.message && subscribeError.message.includes('key')) {
              console.error('Push subscription failed: Invalid VAPID key', subscribeError);
            } else {
              console.error('Push subscription failed with unknown error:', subscribeError);
            }
            
            // Save error info to localStorage for debugging
            try {
              localStorage.setItem('notification_error', JSON.stringify({
                time: new Date().toISOString(),
                name: subscribeError.name,
                message: subscribeError.message
              }));
            } catch (e) {
              console.error('Could not save error to localStorage', e);
            }
            
            throw subscribeError; // Re-throw to be handled upstream
          }
        } catch (keyError) {
          console.error('Error processing VAPID key:', keyError);
          throw new Error('Invalid VAPID key format');
        }
      } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
        throw error; // Re-throw to be handled upstream
      }
    }
    
    static async unsubscribeFromPushNotification() {
      try {
        if (!('serviceWorker' in navigator)) {
          throw new Error('Service Worker not supported');
        }
        
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          console.log('No subscription to unsubscribe from');
          return false;
        }
        
        const result = await subscription.unsubscribe();
        
        if (result) {
          console.log('Successfully unsubscribed from push notifications');
          localStorage.removeItem('notification_subscribed');
        }
        
        return result;
      } catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        return false;
      }
    }
    
    static async getSubscriptionStatus() {
      try {
        if (!('serviceWorker' in navigator)) {
          return {
            supported: false,
            subscribed: false,
            subscription: null
          };
        }
        
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        return {
          supported: true,
          subscribed: !!subscription,
          subscription: subscription
        };
      } catch (error) {
        console.error('Error getting subscription status:', error);
        return {
          supported: true,
          subscribed: false,
          subscription: null,
          error: error.message
        };
      }
    }      static async togglePushNotificationSubscription() {
      try {
        const status = await this.getSubscriptionStatus();
        
        if (!status.supported) {
          console.error('Push notifications are not supported in this browser');
          throw new Error('Push notifications are not supported in this browser');
        }
        
        if (status.subscribed) {
          return await this.unsubscribeFromPushNotification();
        } else {
          // Check current permission state
          if (Notification.permission === 'denied') {
            console.warn('Notification permission is denied');
            this.showPermissionInstructions();
            throw new Error('Notification permission denied by browser settings');
          }
          
          // Request permission if not already granted
          if (Notification.permission !== 'granted') {
            const permission = await this.requestNotificationPermission();
            if (!permission) {
              // The requestNotificationPermission method will already show instructions if needed
              throw new Error('Notification permission denied');
            }
          }
          
          try {
            const registration = await navigator.serviceWorker.ready;
            console.log('Service worker registration ready for push subscription');
            
            const subscription = await this.subscribeToPushNotification(registration);
            
            // If subscription failed, handle it
            if (!subscription) {
              console.error('Subscription attempt returned null');
              throw new Error('Failed to subscribe to push notifications');
            }
            
            return subscription;
          } catch (swError) {
            console.error('Service Worker or Push Subscription error:', swError);
            if (swError.name === 'NotAllowedError') {
              throw new Error('Browser denied permission for notifications');
            } else if (swError.name === 'InvalidStateError') {
              throw new Error('Service Worker is in an invalid state');
            } else if (swError.name === 'ServiceWorkerNotRegisteredException') {
              throw new Error('Service Worker not registered yet');
            } else {
              throw new Error(`Push subscription error: ${swError.message || 'Unknown error'}`);
            }
          }
        }
      } catch (error) {
        console.error('Error in togglePushNotificationSubscription:', error);
        throw error; // Re-throw to be handled by caller
      }
    }    static _urlBase64ToUint8Array(base64String) {
      try {
        // Validate that the input is a string and has reasonable length
        if (typeof base64String !== 'string') {
          throw new Error('VAPID key must be a string');
        }
        
        if (base64String.length < 20) {
          throw new Error('VAPID key is too short');
        }
        
        // Clean the base64 string - remove whitespace, line breaks, etc.
        const cleanedBase64 = base64String.trim().replace(/[\r\n\t\s]/g, '');
        
        // Add padding if needed
        const padding = '='.repeat((4 - (cleanedBase64.length % 4)) % 4);
        const base64 = (cleanedBase64 + padding)
          .replace(/-/g, '+')
          .replace(/_/g, '/');
    
        let rawData;
        try {
          rawData = window.atob(base64);
          console.log('Successfully decoded base64 string, length:', rawData.length);
        } catch (e) {
          console.error('Invalid base64 encoding in VAPID key:', e);
          throw new Error('Invalid base64 encoding in VAPID key: ' + e.message);
        }
        
        const outputArray = new Uint8Array(rawData.length);
    
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        
        // Basic validation of the result
        if (outputArray.length < 16) {
          throw new Error('Converted VAPID key is too short (less than 16 bytes)');
        }
        
        return outputArray;
      } catch (error) {
        console.error('Error converting VAPID key:', error);
        throw error;
      }
    }
  
    static async sendStoryCreatedNotification(storyDescription) {
      if (!('Notification' in window)) return;
      
      // If permission is not granted, request it first
      if (Notification.permission !== 'granted') {
        const permission = await this.requestNotificationPermission();
        if (!permission) return;
      }
      
      // Truncate description if it's too long
      const shortDescription = storyDescription.length > 50 
        ? storyDescription.substring(0, 47) + '...' 
        : storyDescription;
      
      const title = 'Story berhasil dibuat';
      const options = {
        body: `Anda telah membuat story baru dengan deskripsi: ${shortDescription}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        timestamp: Date.now(),
        data: {
          url: '/#/',
          description: storyDescription
        }
      };
      
      // If service worker is active, use it to show notification
      if (navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
      } else {
        // Fallback to regular notification
        new Notification(title, options);
      }
      
      return true;
    }
    
    static async sendNewStoryReceivedNotification(story) {
      if (!('Notification' in window)) return;
      
      // Check if notifications are enabled in user preferences
      const notificationsEnabled = localStorage.getItem('notification_new_stories') !== 'false';
      if (!notificationsEnabled) return;
      
      // If permission is not granted, request it first
      if (Notification.permission !== 'granted') {
        const permission = await this.requestNotificationPermission();
        if (!permission) return;
      }
      
      // Extract story details
      const { name, description, photoUrl, id } = story;
      
      // Truncate description if it's too long
      const shortDescription = description.length > 50 
        ? description.substring(0, 47) + '...' 
        : description;
      
      const title = `New Story from ${name}`;
      const options = {
        body: shortDescription,
        icon: photoUrl || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        image: photoUrl,
        vibrate: [100, 50, 100],
        timestamp: Date.now(),
        data: {
          url: `/#/detail/${id}`,
          storyId: id
        }
      };
      
      // If service worker is active, use it to show notification
      if (navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
      } else {
        // Fallback to regular notification
        new Notification(title, options);
      }
      
      return true;
    }
    
    static async sendNewStoriesReceivedNotification(stories, count) {
      if (!('Notification' in window)) return;
      
      // Check if notifications are enabled in user preferences
      const notificationsEnabled = localStorage.getItem('notification_new_stories') !== 'false';
      if (!notificationsEnabled) return;
      
      // If permission is not granted, request it first
      if (Notification.permission !== 'granted') {
        const permission = await this.requestNotificationPermission();
        if (!permission) return;
      }
      
      // If we have just one story, use the single story notification
      if (count === 1 && stories.length > 0) {
        return this.sendNewStoryReceivedNotification(stories[0]);
      }
      
      const title = 'New Stories Available';
      const options = {
        body: `${count} new stories have been shared. Check them out!`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        timestamp: Date.now(),
        data: {
          url: '/#/',
          count: count
        }
      };
      
      // If service worker is active, use it to show notification
      if (navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
      } else {
        // Fallback to regular notification
        new Notification(title, options);
      }
      
      return true;
    }
    
    static setNewStoriesNotificationPreference(enabled) {
      localStorage.setItem('notification_new_stories', enabled ? 'true' : 'false');
    }
    
    static getNewStoriesNotificationPreference() {
      // Default to true if not set
      return localStorage.getItem('notification_new_stories') !== 'false';
    }
      static async createNotificationToggleButton(containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container with ID ${containerId} not found`);
        return;
      }
      
      // Create the toggle button
      const button = document.createElement('button');
      button.id = 'notification-toggle-btn';
      button.className = 'btn';
      
      // Check if notifications are blocked at browser level
      if (Notification.permission === 'denied') {
        button.innerHTML = '<i class="fas fa-bell-slash"></i> Notifications Blocked';
        button.className = 'btn btn-warning';
        button.disabled = false;
        
        // When clicked, show the permission instructions
        button.addEventListener('click', () => {
          this.showPermissionInstructions();
        });
        
        container.appendChild(button);
        return button;
      }
      
      // Get current subscription status
      const status = await this.getSubscriptionStatus();
      
      // Set initial button state
      this._updateToggleButtonState(button, status.subscribed);
        // Add event listener
      button.addEventListener('click', async () => {
        try {
          button.disabled = true;
          button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
          
          const result = await this.togglePushNotificationSubscription();
          const newStatus = !!result;
          
          this._updateToggleButtonState(button, newStatus);
          
          // Show feedback to user
          const message = newStatus 
            ? 'You have successfully subscribed to notifications!' 
            : 'You have unsubscribed from notifications.';
            
          // You could use a toast notification here or alert
          alert(message);
          
        } catch (error) {
          console.error('Error toggling notification subscription:', error);          
          // Provide user-friendly error message based on the specific error
          let errorMessage = 'An error occurred. Please try again.';
          
          if (error.name === 'NotAllowedError' || 
              error.message.includes('permission denied') || 
              error.message.includes('denied by browser')) {
            errorMessage = 'Notification permission was denied. Check your browser settings.';
          } else if (error.message.includes('not supported')) {
            errorMessage = 'Push notifications are not supported in your browser.';
          } else if (error.message.includes('Service Worker')) {
            errorMessage = 'Service Worker issue: ' + error.message;
          } else if (error.message.includes('VAPID key')) {
            errorMessage = 'Application configuration error. Please contact support.';
          } else if (error.name === 'InvalidStateError') {
            errorMessage = 'Browser is in an invalid state. Try refreshing the page.';
          } else if (error.name === 'NetworkError' || error.message.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection.';
          }
          
          // Show the error message with troubleshooting option
          const troubleshoot = confirm(`Error: ${errorMessage}\n\nWould you like to run the troubleshooter to fix common notification issues?`);
          
          if (troubleshoot) {
            // Import and run the troubleshooter
            import('./notification-troubleshooter.js').then(module => {
              const NotificationTroubleshooter = module.default;
              NotificationTroubleshooter.repairNotificationSystem();
            }).catch(importError => {
              console.error('Failed to load troubleshooter:', importError);
              alert('Could not load the troubleshooter. Please refresh the page and try again.');
            });
          }
          
          // Log detailed error information to localStorage for debugging
          try {
            const errorLog = {
              time: new Date().toISOString(),
              name: error.name,
              message: error.message,
              stack: error.stack
            };
            localStorage.setItem('notification_error_log', JSON.stringify(errorLog));
          } catch (e) {
            console.error('Failed to log error to localStorage', e);
          }
          
          // Reset button state based on actual status
          try {
            const currentStatus = await this.getSubscriptionStatus();
            this._updateToggleButtonState(button, currentStatus.subscribed);
            
            // If notifications are now denied, update the button to reflect this
            if (Notification.permission === 'denied') {
              button.innerHTML = '<i class="fas fa-bell-slash"></i> Notifications Blocked';
              button.className = 'btn btn-warning';
              
              // Replace the event listener
              button.replaceWith(button.cloneNode(true));
              button = document.getElementById('notification-toggle-btn');
              
              button.addEventListener('click', () => {
                this.showPermissionInstructions();
              });
            }
          } catch (statusError) {
            console.error('Failed to get subscription status after error', statusError);
            // Fallback to a safe state
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-bell"></i> Try Again';
            button.className = 'btn btn-primary';
          }
        }
      });
      
      // Add button to container
      container.appendChild(button);
      
      return button;
    }
    
    static _updateToggleButtonState(button, isSubscribed) {
      if (isSubscribed) {
        button.innerHTML = '<i class="fas fa-bell-slash"></i> Unsubscribe from Notifications';
        button.className = 'btn btn-outline-secondary';
      } else {
        button.innerHTML = '<i class="fas fa-bell"></i> Subscribe to Notifications';
        button.className = 'btn btn-primary';
      }
      button.disabled = false;
    }
    
    static createNewStoriesNotificationToggle(containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container with ID ${containerId} not found`);
        return;
      }
      
      // Create the toggle switch container
      const toggleContainer = document.createElement('div');
      toggleContainer.className = 'form-check form-switch';
      
      // Create the toggle input
      const toggleInput = document.createElement('input');
      toggleInput.className = 'form-check-input';
      toggleInput.type = 'checkbox';
      toggleInput.id = 'newStoriesNotificationToggle';
      toggleInput.checked = this.getNewStoriesNotificationPreference();
      
      // Create the label
      const label = document.createElement('label');
      label.className = 'form-check-label';
      label.htmlFor = 'newStoriesNotificationToggle';
      label.textContent = 'Notify me when new stories are posted';
      
      // Add event listener
      toggleInput.addEventListener('change', (event) => {
        this.setNewStoriesNotificationPreference(event.target.checked);
      });
      
      // Assemble and append to container
      toggleContainer.appendChild(toggleInput);
      toggleContainer.appendChild(label);
      container.appendChild(toggleContainer);
      
      return toggleInput;
    }
    static async showNotification(data) {
      // Check if Notification API is supported
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
      }
      
      // Check permission
      if (Notification.permission !== 'granted') {
        console.log('Notification permission not granted');
        
        // Only show permission instructions if the user explicitly tried to show a notification
        if (data.userInitiated) {
          this.showPermissionInstructions();
        }
        
        return false;
      }
      
      // Add client URL if not already present
      if (!data.clientUrl) {
        data.clientUrl = window.location.origin;
      }
      
      // Check if Service Worker is available and ready
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Use Service Worker to show notification
        const title = data.title || 'Story App';
        const options = data.options || {
          body: 'New notification from Story App',
          icon: '/images/logo-192x192.png',
          badge: '/images/logo-72x72.png',
        };
        
        try {
          await navigator.serviceWorker.ready;
          await navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: title,
            options: options,
            clientUrl: data.clientUrl
          });
          return true;
        } catch (error) {
          console.error('Error showing notification through Service Worker:', error);
          
          // Fallback to regular Notification API
          try {
            new Notification(title, options);
            return true;
          } catch (notifError) {
            console.error('Error showing notification through Notification API:', notifError);
            return false;
          }
        }
      } else {
        // Fallback to regular Notification API
        const title = data.title || 'Story App';
        const options = data.options || {
          body: 'New notification from Story App',
          icon: '/images/logo-192x192.png',
        };
        
        try {
          new Notification(title, options);
          return true;
        } catch (error) {
          console.error('Error showing notification through Notification API:', error);
          return false;
        }
      }
    }
    
    static isAppInstalled() {
      // Check if app is installed (standalone mode)
      return window.matchMedia('(display-mode: standalone)').matches || 
             window.navigator.standalone === true;
    }
    
    static isPushSupported() {
      return 'PushManager' in window;
    }
    
    static isNotificationSupported() {
      return 'Notification' in window;
    }
      static isServiceWorkerSupported() {
      return 'serviceWorker' in navigator;
    }
      static async diagnoseNotificationIssues() {
      const diagnostics = {
        browser: navigator.userAgent,
        timestamp: new Date().toISOString(),
        notificationAPI: this.isNotificationSupported(),
        pushAPI: this.isPushSupported(),
        serviceWorkerAPI: this.isServiceWorkerSupported(),
        permission: Notification.permission
      };
      
      // Check Service Worker status
      diagnostics.serviceWorker = await this.checkServiceWorkerStatus();
      
      // Check subscription status
      try {
        diagnostics.subscription = await this.getSubscriptionStatus();
      } catch (error) {
        diagnostics.subscription = {
          error: error.message,
          supported: false
        };
      }
      
      // Check VAPID key
      try {
        const vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
        const convertedKey = this._urlBase64ToUint8Array(vapidPublicKey);
        diagnostics.vapidKey = {
          valid: true,
          length: convertedKey.length
        };
      } catch (error) {
        diagnostics.vapidKey = {
          valid: false,
          error: error.message
        };
      }
      
      // Get any stored logs
      try {
        const errorLog = localStorage.getItem('notification_error_log');
        if (errorLog) {
          diagnostics.lastError = JSON.parse(errorLog);
        }
        
        const attemptsLog = localStorage.getItem('notification_attempts_log');
        if (attemptsLog) {
          diagnostics.attempts = JSON.parse(attemptsLog);
        }
      } catch (e) {
        diagnostics.logParsingError = e.message;
      }
      
      // Store the diagnostics report
      try {
        localStorage.setItem('notification_diagnostics', JSON.stringify(diagnostics));
      } catch (e) {
        console.error('Failed to store diagnostics', e);
      }
      
      console.log('Notification Diagnostics:', diagnostics);
      return diagnostics;
    }
    
    static async troubleshootNotifications() {
      // Run diagnostics
      const diagnostics = await this.diagnoseNotificationIssues();
      
      // Generate troubleshooting steps based on the diagnostics
      let steps = [];
      let criticalIssue = false;
      
      // Check for browser support
      if (!diagnostics.notificationAPI) {
        steps.push('Your browser does not support notifications. Try using a modern browser like Chrome, Firefox, or Edge.');
        criticalIssue = true;
      }
      
      if (!diagnostics.pushAPI) {
        steps.push('Your browser does not support push notifications. Try using a modern browser like Chrome, Firefox, or Edge.');
        criticalIssue = true;
      }
      
      if (!diagnostics.serviceWorkerAPI) {
        steps.push('Your browser does not support Service Workers, which are required for push notifications. Try using a modern browser.');
        criticalIssue = true;
      }
      
      // If there are critical issues, no need to proceed
      if (criticalIssue) {
        return {
          canFix: false,
          steps: steps,
          diagnostics: diagnostics
        };
      }
      
      // Check permission
      if (diagnostics.permission === 'denied') {
        steps.push('Notification permission is denied. You need to reset permissions in your browser settings.');
        this.showPermissionInstructions();
      } else if (diagnostics.permission === 'default') {
        steps.push('Notification permission has not been granted. Try subscribing to notifications again.');
      }
      
      // Check Service Worker
      if (!diagnostics.serviceWorker.active) {
        steps.push('Service Worker is not active. Try refreshing the page to register the Service Worker.');
      } else if (diagnostics.serviceWorker.error) {
        steps.push(`Service Worker error: ${diagnostics.serviceWorker.message}. Try clearing your browser cache and refreshing.`);
      }
      
      // Check VAPID key
      if (diagnostics.vapidKey && !diagnostics.vapidKey.valid) {
        steps.push('There is an issue with the application server key. This is a configuration issue that requires developer attention.');
      }
      
      // Check subscription
      if (!diagnostics.subscription.supported) {
        steps.push('Push Manager subscription is not supported or not working correctly. Try refreshing the page.');
      } else if (diagnostics.subscription.error) {
        steps.push(`Subscription error: ${diagnostics.subscription.error}. Try clearing your browser cache and refreshing.`);
      }
      
      // Generate solutions
      let solutions = [];
      
      if (steps.length === 0) {
        solutions.push('No issues detected. If you are still experiencing problems, try refreshing the page or clearing your browser cache.');
      } else {
        // Add general solutions
        solutions.push('Refresh the page and try again');
        solutions.push('Clear your browser cache and cookies, then try again');
        
        if (diagnostics.permission === 'denied') {
          solutions.push('Reset notification permissions in your browser settings');
        }
        
        solutions.push('Try using a different browser');
      }
      
      return {
        canFix: steps.length > 0,
        steps: steps,
        solutions: solutions,
        diagnostics: diagnostics
      };
    }
    
    static async showTroubleshootingGuide() {
      const result = await this.troubleshootNotifications();
      
      let message = 'Notification Troubleshooting Guide\n\n';
      
      if (result.steps.length > 0) {
        message += 'Issues Found:\n';
        result.steps.forEach((step, index) => {
          message += `${index + 1}. ${step}\n`;
        });
        
        message += '\nRecommended Solutions:\n';
        result.solutions.forEach((solution, index) => {
          message += `${index + 1}. ${solution}\n`;
        });
      } else {
        message += 'No specific issues detected. If you are still experiencing problems:\n';
        result.solutions.forEach((solution, index) => {
          message += `${index + 1}. ${solution}\n`;
        });
      }
      
      // Add technical information for support
      message += '\n\nTechnical Information (for support):\n';
      message += `Browser: ${result.diagnostics.browser}\n`;
      message += `Notification Permission: ${result.diagnostics.permission}\n`;
      message += `Service Worker Active: ${result.diagnostics.serviceWorker.active}\n`;
      
      if (result.diagnostics.lastError) {
        message += `Last Error: ${result.diagnostics.lastError.message}\n`;
        message += `Error Time: ${result.diagnostics.lastError.time}\n`;
      }
      
      alert(message);
      return result;
    }
    
    static async sendSubscriptionToServer(subscription) {
    try {
      // Get current website URL for verification
      const clientUrl = window.location.origin;
      
      console.log('Sending subscription to server with client URL:', clientUrl);
      
      // Import the CONFIG to get the base URL
      const CONFIG = (await import('../config.js')).default;
      
      // Get the user token for authentication
      const AuthHelper = (await import('../utils/auth-helper.js')).default;
      const token = AuthHelper.getToken();
      
      if (!token) {
        console.error('Authentication token not found, cannot send subscription to server');
        return false;
      }
      
      // Prepare subscription data with client URL
      const subscriptionData = {
        subscription: subscription.toJSON(), // Convert PushSubscription to JSON
        clientUrl: clientUrl
      };
      
      // Log subscription data for debugging
      console.log('Subscription data being sent:', JSON.stringify(subscriptionData));
      
      // Send to server
      const response = await fetch(`${CONFIG.BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscriptionData)
      });
      
      // Parse response
      const responseData = await response.json();
      
      if (!response.ok || responseData.error) {
        console.error('Error sending subscription to server:', responseData.message || 'Unknown error');
        // Store error for troubleshooting
        this.logNotificationAttempt('subscribe_server', 'failed', {
          status: response.status,
          message: responseData.message || 'Unknown error'
        });
        return false;
      }
      
      // Log success
      console.log('Successfully sent subscription to server:', responseData);
      this.logNotificationAttempt('subscribe_server', 'success');
      return true;
    } catch (error) {
      console.error('Exception sending subscription to server:', error);
      // Store error for troubleshooting
      this.logNotificationAttempt('subscribe_server', 'failed', error);
      return false;
    }
  }
  
  static logNotificationAttempt(action, status, error = null) {
    try {
      // Get existing logs or initialize new array
      let logs = [];
      const existingLogs = localStorage.getItem('notification_attempts_log');
      
      if (existingLogs) {
        logs = JSON.parse(existingLogs);
      }
      
      // Add new log entry
      logs.push({
        action,
        status,
        error: error ? { 
          name: error.name || 'Error', 
          message: error.message || String(error),
          status: error.status
        } : null,
        timestamp: new Date().toISOString(),
        clientUrl: window.location.origin
      });
      
      // Keep only the last 10 logs to avoid storage issues
      if (logs.length > 10) {
        logs = logs.slice(-10);
      }
      
      // Save back to localStorage
      localStorage.setItem('notification_attempts_log', JSON.stringify(logs));
      
      console.log(`Notification attempt logged: ${action} - ${status}`);
    } catch (e) {
      console.error('Error logging notification attempt:', e);
    }
  }
  }
  
  export default NotificationHelper;
