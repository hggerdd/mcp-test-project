/**
 * Topic Service using the state management system.
 * 
 * Provides methods for working with topics while leveraging the state management.
 */

import { store, actions, selectors } from '../state/index.js';
import { validateTopic } from '../models/topic.js';

export class TopicService {
  /**
   * Get all topics
   * 
   * @returns {Array} Array of topic objects
   */
  getAllTopics() {
    return store.getState().topics;
  }
  
  /**
   * Get a specific topic by ID
   * 
   * @param {string} topicId - The topic ID
   * @returns {Object|null} Topic object or null if not found
   */
  getTopicById(topicId) {
    return selectors.selectTopicById(store.getState(), topicId);
  }
  
  /**
   * Create a new topic
   * 
   * @param {string} name - Topic name
   * @param {Array} initialCategories - Initial categories for the topic (optional)
   * @returns {Promise<Object>} The created topic
   */
  async createTopic(name, initialCategories = []) {
    // Add the topic to the store
    store.dispatch(actions.addTopic(name));
    
    // Get the newly created topic (should be the last one)
    const state = store.getState();
    const newTopic = state.topics[state.topics.length - 1];
    
    // If initial categories provided, add them
    if (initialCategories && initialCategories.length > 0) {
      for (const categoryName of initialCategories) {
        store.dispatch(actions.addCategory(categoryName, newTopic.id));
      }
    }
    
    return newTopic;
  }
  
  /**
   * Update an existing topic
   * 
   * @param {string} topicId - Topic ID to update
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated topic or null if not found
   */
  async updateTopic(topicId, updates) {
    // Ensure topic exists
    const topic = this.getTopicById(topicId);
    if (!topic) {
      return null;
    }
    
    // Update the topic
    store.dispatch(actions.updateTopic(topicId, updates));
    
    // Return the updated topic
    return this.getTopicById(topicId);
  }
  
  /**
   * Delete a topic
   * 
   * @param {string} topicId - Topic ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteTopic(topicId) {
    // Ensure topic exists
    const topic = this.getTopicById(topicId);
    if (!topic) {
      return false;
    }
    
    // Delete the topic (also handles related categories and bookmarks via reducers)
    store.dispatch(actions.deleteTopic(topicId));
    
    return true;
  }
  
  /**
   * Get the currently active topic
   * 
   * @returns {Promise<Object|null>} Active topic or null
   */
  async getActiveTopic() {
    return selectors.selectActiveTopic(store.getState());
  }
  
  /**
   * Set the active topic
   * 
   * @param {string} topicId - Topic ID to set as active
   * @returns {Promise<Object|null>} The active topic or null if not found
   */
  async setActiveTopic(topicId) {
    // Ensure topic exists
    const topic = this.getTopicById(topicId);
    if (!topic) {
      return null;
    }
    
    // Set as active
    store.dispatch(actions.setActiveTopic(topicId));
    
    return topic;
  }
  
  /**
   * Get all tabs related to a topic
   * 
   * @param {string} topicId - Topic ID
   * @returns {Promise<Array>} Array of tab objects
   */
  async getTopicTabs(topicId) {
    try {
      // This requires accessing browser API directly
      // Later we might want to also track this in state
      const tabs = await browser.tabs.query({});
      
      // Filter tabs that belong to this topic (based on your tab tagging mechanism)
      // Implementation depends on how tabs are associated with topics
      
      return tabs; // For now return all tabs, would need to be filtered based on your mechanism
    } catch (error) {
      console.error('Error getting topic tabs:', error);
      return [];
    }
  }
  
  /**
   * Add a tab to a topic
   * 
   * @param {string} topicId - Topic ID
   * @param {number} tabId - Tab ID
   * @returns {Promise<boolean>} Success status
   */
  async addTabToTopic(topicId, tabId) {
    try {
      // Implementation depends on how tabs are associated with topics
      // This might involve tagging the tab or updating some state
      
      return true;
    } catch (error) {
      console.error('Error adding tab to topic:', error);
      return false;
    }
  }
  
  /**
   * Remove a tab from a topic
   * 
   * @param {string} topicId - Topic ID
   * @param {number} tabId - Tab ID
   * @returns {Promise<boolean>} Success status
   */
  async removeTabFromTopic(topicId, tabId) {
    try {
      // Implementation depends on how tabs are associated with topics
      
      return true;
    } catch (error) {
      console.error('Error removing tab from topic:', error);
      return false;
    }
  }
}

export default TopicService;
