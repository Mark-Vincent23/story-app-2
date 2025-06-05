import StoryAPI from "../../data/api";

export default class StoryModel {
  constructor() {
    this._lastStoriesIds = new Set();
  }

  async getStories() {
    try {
      const stories = await StoryAPI.getAllStories();
      const newStories = this._detectNewStories(stories);
      return stories;
    } catch (error) {
      throw new Error(`Failed to fetch stories: ${error.message}`);
    }
  }

  async getStoryDetail(id) {
    try {
      return await StoryAPI.getStoryDetail(id);
    } catch (error) {
      throw new Error(`Failed to fetch story details: ${error.message}`);
    }
  }

  async addToFavorites(story) {
    try {
      return await StoryAPI.addToFavorites(story);
    } catch (error) {
      throw new Error(`Failed to add story to favorites: ${error.message}`);
    }
  }

  async removeFromFavorites(storyId) {
    try {
      return await StoryAPI.removeFromFavorites(storyId);
    } catch (error) {
      throw new Error(`Failed to remove story from favorites: ${error.message}`);
    }
  }

  async getFavoriteStories() {
    try {
      return await StoryAPI.getFavoriteStories();
    } catch (error) {
      throw new Error(`Failed to fetch favorite stories: ${error.message}`);
    }
  }

  _detectNewStories(stories) {
    if (!stories || stories.length === 0) return [];
    
    const newStories = [];
    const currentStoriesIds = new Set(stories.map(story => story.id));
    
    // If this is the first load, just save the IDs and return empty array
    if (this._lastStoriesIds.size === 0) {
      this._lastStoriesIds = currentStoriesIds;
      return newStories;
    }
    
    // Find new stories that weren't in the last fetch
    stories.forEach(story => {
      if (!this._lastStoriesIds.has(story.id)) {
        newStories.push(story);
      }
    });
    
    // Update the stored IDs
    this._lastStoriesIds = currentStoriesIds;
    
    return newStories;
  }
}
