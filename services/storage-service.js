/**
 * Updated Storage Service that interfaces with the state management system.
 * 
 * This service now primarily serves as a legacy adapter for code that hasn't
 * been updated to use the state management system directly. New code should
 * use the state system instead.
 */

import { store, actions, ActionTypes } from '../state/index.js';

// Storage version for future-proofing data migrations
const STORAGE_VERSION = 1;

export class StorageService {
  /**
   * Initialize the storage service
   */
  constructor() {
    this.defaultCategorySets = {
      standard: {
        name: "Standard Set",
        categories: ["Files", "Notes", "Links"]
      }
    };
  }
  
  /**
   * Save data to browser storage
   * 
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   * @returns {Promise<boolean>} Success status
   * 
   * @deprecated Use state management actions instead
   */
  async saveData(key, data) {
    try {
      const payload = {};
      payload[key] = data;
      
      // Use browser storage directly
      await browser.storage.local.set(payload);
      console.log(`Data saved for key: ${key}`);
      
      // Update state if applicable
      this._updateStateFromStorage(key, data);
      
      return true;
    } catch (error) {
      console.error(`Error saving data for key ${key}:`, error);
      throw error;
    }
  }
  
  /**
   * Load data from browser storage
   * 
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {Promise<any>} The stored data or default value
   * 
   * @deprecated Use state selectors instead
   */
  async loadData(key, defaultValue = null) {
    try {
      const result = await browser.storage.local.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      console.error(`Error loading data for key ${key}:`, error);
      throw error;
    }
  }
  
  /**
   * Remove data from browser storage
   * 
   * @param {string} key - Storage key to remove
   * @returns {Promise<boolean>} Success status
   * 
   * @deprecated Use state management actions instead
   */
  async removeData(key) {
    try {
      await browser.storage.local.remove(key);
      console.log(`Data removed for key: ${key}`);
      
      // Update state if applicable
      this._removeFromState(key);
      
      return true;
    } catch (error) {
      console.error(`Error removing data for key ${key}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all topics from storage
   * 
   * @returns {Promise<Array>} Array of topics
   * 
   * @deprecated Use state.topics directly
   */
  async getTopics() {
    return store.getState().topics;
  }
  
  /**
   * Save topics to storage
   * 
   * @param {Array} topics - Array of topic objects
   * @returns {Promise<void>}
   * 
   * @deprecated Use actions.setTopics() instead
   */
  async saveTopics(topics) {
    // Update state
    store.dispatch(actions.setTopics({ topics }));
  }
  
  /**
   * Get categories for a specific topic
   * 
   * @param {string} topicId - The topic ID
   * @returns {Promise<Array>} Array of categories
   * 
   * @deprecated Use state.categories[topicId] directly
   */
  async getCategories(topicId) {
    const state = store.getState();
    return state.categories[topicId] || [];
  }
  
  /**
   * Save categories for a specific topic
   * 
   * @param {string} topicId - The topic ID
   * @param {Array} categories - Array of category objects
   * @returns {Promise<void>}
   * 
   * @deprecated Use actions.setCategories() instead
   */
  async saveCategories(topicId, categories) {
    // Update state
    store.dispatch(actions.setCategories({ topicId, categories }));
  }
  
  /**
   * Get bookmarks for a specific category
   * 
   * @param {string} categoryId - The category ID
   * @returns {Promise<Array>} Array of bookmark objects
   * 
   * @deprecated Use state.bookmarks[categoryId] directly
   */
  async getBookmarks(categoryId) {
    const state = store.getState();
    return state.bookmarks[categoryId] || [];
  }
  
  /**
   * Save bookmarks for a specific category
   * 
   * @param {string} categoryId - The category ID
   * @param {Array} bookmarks - Array of bookmark objects
   * @returns {Promise<void>}
   * 
   * @deprecated Use actions.setBookmarks() instead
   */
  async saveBookmarks(categoryId, bookmarks) {
    // Update state
    store.dispatch(actions.setBookmarks({ categoryId, bookmarks }));
  }
  
  /**
   * Get all category sets
   * 
   * @returns {Promise<Object>} Object containing category sets
   * 
   * @deprecated Use state.categorySets directly
   */
  async getCategorySets() {
    const state = store.getState();
    return state.categorySets || this.defaultCategorySets;
  }
  
  /**
   * Save category sets
   * 
   * @param {Object} categorySets - Object containing category sets
   * @returns {Promise<void>}
   * 
   * @deprecated Use actions.setCategorySets() instead
   */
  async saveCategorySets(categorySets) {
    // Update state
    store.dispatch(actions.setCategorySets({ categorySets }));
  }
  
  /**
   * Get active topic ID
   * 
   * @returns {Promise<string|null>} Active topic ID or null
   * 
   * @deprecated Use state.activeTopicId directly
   */
  async getActiveTopicId() {
    return store.getState().activeTopicId;
  }
  
  /**
   * Set active topic ID
   * 
   * @param {string} topicId - Topic ID to set as active
   * @returns {Promise<void>}
   * 
   * @deprecated Use actions.setActiveTopic() instead
   */
  async setActiveTopicId(topicId) {
    // Update state
    store.dispatch(actions.setActiveTopic({ topicId }));
  }
  
  /**
   * Export all extension data as a JSON object
   * 
   * @returns {Promise<Object>} All stored data
   */
  async exportAllData() {
    try {
      // Get current state
      const state = store.getState();
      
      // Clean up state for export
      const exportState = {
        topics: state.topics,
        activeTopicId: state.activeTopicId,
        categorySets: state.categorySets,
        categories: state.categories,
        bookmarks: state.bookmarks
      };
      
      return {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        data: exportState
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }
  
  /**
   * Import data from a JSON object
   * 
   * @param {Object} importData - Data to import
   * @returns {Promise<boolean>} Success status
   */
  async importAllData(importData) {
    try {
      if (!importData || !importData.data || !importData.version) {
        throw new Error('Invalid import data format');
      }
      
      // TODO: Add version migration logic for future versions
      
      // Import data into state
      const data = importData.data;
      
      // Reset state first
      store.dispatch(actions.resetState());
      
      // Import topics
      if (data.topics) {
        store.dispatch(actions.setTopics({ topics: data.topics }));
      }
      
      // Import active topic ID
      if (data.activeTopicId) {
        store.dispatch(actions.setActiveTopic({ topicId: data.activeTopicId }));
      }
      
      // Import category sets
      if (data.categorySets) {
        store.dispatch(actions.setCategorySets({ categorySets: data.categorySets }));
      }
      
      // Import categories and bookmarks
      if (data.categories) {
        for (const [topicId, categories] of Object.entries(data.categories)) {
          store.dispatch(actions.setCategories({ topicId, categories }));
        }
      }
      
      if (data.bookmarks) {
        for (const [categoryId, bookmarks] of Object.entries(data.bookmarks)) {
          store.dispatch(actions.setBookmarks({ categoryId, bookmarks }));
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to update state based on storage key
   * 
   * @private
   * @param {string} key - Storage key
   * @param {any} data - Storage data
   */
  _updateStateFromStorage(key, data) {
    // Update state based on the key
    if (key === 'topics') {
      store.dispatch(actions.setTopics({ topics: data }));
    } else if (key === 'activeTopicId') {
      store.dispatch(actions.setActiveTopic({ topicId: data }));
    } else if (key === 'categorySets') {
      store.dispatch(actions.setCategorySets({ categorySets: data }));
    } else if (key.startsWith('categories_')) {
      const topicId = key.substring('categories_'.length);
      store.dispatch(actions.setCategories({ topicId, categories: data }));
    } else if (key.startsWith('bookmarks_')) {
      const categoryId = key.substring('bookmarks_'.length);
      store.dispatch(actions.setBookmarks({ categoryId, bookmarks: data }));
    }
  }
  
  /**
   * Helper method to update state when data is removed
   * 
   * @private
   * @param {string} key - Storage key
   */
  _removeFromState(key) {
    // Update state based on the key
    if (key === 'topics') {
      store.dispatch(actions.setTopics({ topics: [] }));
    } else if (key === 'activeTopicId') {
      store.dispatch(actions.setActiveTopic({ topicId: null }));
    } else if (key === 'categorySets') {
      store.dispatch(actions.setCategorySets({ categorySets: this.defaultCategorySets }));
    } else if (key.startsWith('categories_')) {
      const topicId = key.substring('categories_'.length);
      store.dispatch(actions.setCategories({ topicId, categories: [] }));
    } else if (key.startsWith('bookmarks_')) {
      const categoryId = key.substring('bookmarks_'.length);
      store.dispatch(actions.setBookmarks({ categoryId, bookmarks: [] }));
    }
  }
}

export default StorageService;
