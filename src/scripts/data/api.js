import CONFIG from '../config';
import AuthHelper from '../utils/auth-helper';
import DBHelper from './db-helper';
import NotificationHelper from '../utils/notification-helper';

class StoryAPI {
  static async login(email, password) {
    try {
      const response = await fetch(`${CONFIG.BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      return responseJson.loginResult;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }
  
  static async register(name, email, password) {
    try {
      const response = await fetch(`${CONFIG.BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });
      
      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      return responseJson;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  }

  static async getAllStories() {
    try {
      const token = AuthHelper.getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      try {
        // Try to fetch from network first
        const response = await fetch(`${CONFIG.BASE_URL}/stories`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const responseJson = await response.json();
        
        if (responseJson.error) {
          throw new Error(responseJson.message);
        }
        
        const stories = responseJson.listStory || [];
        
        // Store stories in IndexedDB for offline access
        await DBHelper.saveStories(stories);
        
        // Return the stories from the network
        return stories;
      } catch (networkError) {
        console.log('Network error, fetching from IndexedDB:', networkError);
        
        // If network request fails, try to get from IndexedDB
        const offlineStories = await DBHelper.getStories();
        
        if (offlineStories && offlineStories.length > 0) {
          console.log('Retrieved stories from IndexedDB');
          return offlineStories;
        }
        
        // If no stories in IndexedDB, propagate the original error
        throw networkError;
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      throw error;
    }
  }
  
  static async getStoryDetail(id) {
    try {
      const token = AuthHelper.getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      try {
        // Try to fetch from network first
        const response = await fetch(`${CONFIG.BASE_URL}/stories/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const responseJson = await response.json();
        
        if (responseJson.error) {
          throw new Error(responseJson.message);
        }
        
        const story = responseJson.story;
        
        // Store the story in IndexedDB for offline access
        await DBHelper.saveStory(story);
        
        return story;
      } catch (networkError) {
        console.log(`Network error, fetching story ${id} from IndexedDB:`, networkError);
        
        // If network request fails, try to get from IndexedDB
        const offlineStory = await DBHelper.getStoryById(id);
        
        if (offlineStory) {
          console.log('Retrieved story from IndexedDB');
          return offlineStory;
        }
        
        // If story not in IndexedDB, propagate the original error
        throw networkError;
      }
    } catch (error) {
      console.error(`Error fetching story detail for ID ${id}:`, error);
      throw error;
    }
  }
  
  static async addNewStory({ description, photo, lat, lon }) {
    try {
      const token = AuthHelper.getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const formData = new FormData();
      formData.append('description', description);
      formData.append('photo', photo);
      
      if (lat && lon) {
        formData.append('lat', lat);
        formData.append('lon', lon);
      }
      
      const response = await fetch(`${CONFIG.BASE_URL}/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      return responseJson;
    } catch (error) {
      console.error('Error adding new story:', error);
      throw error;
    }
  }
  
  static async addToFavorites(story) {
    try {
      // Add a favorite flag to the story
      const storyWithFavorite = { ...story, isFavorite: true };
      
      // Save to IndexedDB
      await DBHelper.saveStory(storyWithFavorite);
      
      // Show notification
      NotificationHelper.showNotification({
        title: 'Added to Favorites',
        options: {
          body: `"${story.name}" has been added to favorites`,
          icon: '/images/logo-192x192.png',
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      throw error;
    }
  }
  
  static async removeFromFavorites(storyId) {
    try {
      // Get the story first
      const story = await DBHelper.getStoryById(storyId);
      
      if (!story) {
        throw new Error('Story not found in database');
      }
      
      // Update the favorite flag
      const updatedStory = { ...story, isFavorite: false };
      
      // Save to IndexedDB
      await DBHelper.saveStory(updatedStory);
      
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      throw error;
    }
  }
  
  static async getFavoriteStories() {
    try {
      // Get all stories from IndexedDB
      const allStories = await DBHelper.getStories();
      
      // Filter only favorites
      return allStories.filter(story => story.isFavorite === true);
    } catch (error) {
      console.error('Error getting favorite stories:', error);
      throw error;
    }
  }
}

export default StoryAPI;
