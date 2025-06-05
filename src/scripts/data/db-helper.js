const DATABASE_NAME = 'story-app-db';
const DATABASE_VERSION = 1;
const STORE_NAME = 'stories';

class DBHelper {
  static openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('Your browser doesn\'t support IndexedDB'));
        return;
      }

      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onerror = (event) => {
        reject(new Error('Error opening IndexedDB'));
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create an object store for stories if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Create indexes
          objectStore.createIndex('id', 'id', { unique: true });
          objectStore.createIndex('title', 'name', { unique: false });
          objectStore.createIndex('date', 'createdAt', { unique: false });
        }
      };
    });
  }

  static async saveStory(story) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(story);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(new Error('Error saving story to IndexedDB'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  static async saveStories(stories) {
    const db = await this.openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      let successCount = 0;
      
      stories.forEach((story) => {
        const request = store.put(story);
        
        request.onsuccess = () => {
          successCount++;
          if (successCount === stories.length) {
            resolve(true);
          }
        };
        
        request.onerror = () => {
          reject(new Error('Error saving stories to IndexedDB'));
        };
      });
      
      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  static async getStories() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(new Error('Error getting stories from IndexedDB'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  static async getStoryById(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(new Error('Error getting story from IndexedDB'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  static async deleteStory(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(new Error('Error deleting story from IndexedDB'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }

  static async clearStories() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(new Error('Error clearing stories from IndexedDB'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  }
}

export default DBHelper;
