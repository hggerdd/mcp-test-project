/**
 * Bookmark Service using the state management system.
 * 
 * Provides methods for working with bookmarks.
 */

import { store, actions, selectors } from '../state/index.js';
import { validateBookmark } from '../models/bookmark.js';
import { MessageTypes, sendMessage } from '../background/messages.js';

export class BookmarkService {
  /**
   * Get all bookmarks for a category
   * 
   * @param {string} categoryId - Category ID
   * @returns {Array} Array of bookmark objects
   */
  getBookmarks(categoryId) {
    return selectors.selectBookmarksByCategoryId(store.getState(), categoryId);
  }
  
  /**
   * Get a specific bookmark by ID
   * 
   * @param {string} categoryId - Category ID
   * @param {string} bookmarkId - Bookmark ID
   * @returns {Object|null} Bookmark object or null if not found
   */
  getBookmarkById(categoryId, bookmarkId) {
    return selectors.selectBookmarkById(store.getState(), categoryId, bookmarkId);
  }
  
  /**
   * Create a new bookmark
   * 
   * @param {string} title - Bookmark title
   * @param {string} url - Bookmark URL
   * @param {string} categoryId - Category ID
   * @returns {Object} The created bookmark
   */
  async createBookmark(title, url, categoryId) {
    // Validate URL
    try {
      new URL(url); // Will throw if URL is invalid
    } catch (error) {
      throw new Error('Invalid URL');
    }
    
    // Add the bookmark to the store
    store.dispatch(actions.addBookmark(title, url, categoryId));
    
    // Get the newly created bookmark
    const bookmarks = this.getBookmarks(categoryId);
    return bookmarks[bookmarks.length - 1];
  }
  
  /**
   * Update an existing bookmark
   * 
   * @param {string} categoryId - Category ID
   * @param {string} bookmarkId - Bookmark ID to update
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated bookmark or null if not found
   */
  async updateBookmark(categoryId, bookmarkId, updates) {
    // Ensure bookmark exists
    const bookmark = this.getBookmarkById(categoryId, bookmarkId);
    if (!bookmark) {
      return null;
    }
    
    // Validate URL if updating it
    if (updates.url) {
      try {
        new URL(updates.url); // Will throw if URL is invalid
      } catch (error) {
        throw new Error('Invalid URL');
      }
    }
    
    // Update the bookmark
    store.dispatch(actions.updateBookmark(bookmarkId, categoryId, updates));
    
    // Return the updated bookmark
    return this.getBookmarkById(categoryId, bookmarkId);
  }
  
  /**
   * Delete a bookmark
   * 
   * @param {string} categoryId - Category ID
   * @param {string} bookmarkId - Bookmark ID to delete
   * @returns {boolean} Success status
   */
  async deleteBookmark(categoryId, bookmarkId) {
    // Ensure bookmark exists
    const bookmark = this.getBookmarkById(categoryId, bookmarkId);
    if (!bookmark) {
      return false;
    }
    
    // Delete the bookmark
    store.dispatch(actions.deleteBookmark(bookmarkId, categoryId));
    
    return true;
  }
  
  /**
   * Create a bookmark from the current active tab
   * 
   * @param {string} categoryId - Category ID
   * @returns {Object|null} Created bookmark or null if no active tab
   */
  async createBookmarkFromCurrentTab(categoryId) {
    try {
      // Get current tab information
      const tabInfo = await sendMessage(MessageTypes.GET_CURRENT_TAB);
      
      if (!tabInfo || !tabInfo.url) {
        return null;
      }
      
      // Create bookmark from tab
      return this.createBookmark(tabInfo.title, tabInfo.url, categoryId);
    } catch (error) {
      console.error('Error creating bookmark from current tab:', error);
      throw error;
    }
  }
  
  /**
   * Search for bookmarks across all categories
   * 
   * @param {string} query - Search query
   * @param {string} [topicId] - Optional topic ID to limit search
   * @returns {Array} Array of matching bookmarks with context
   */
  searchBookmarks(query, topicId = null) {
    return selectors.searchBookmarks(store.getState(), query, topicId);
  }
  
  /**
   * Get all bookmarks for a topic
   * 
   * @param {string} topicId - Topic ID
   * @returns {Array} Array of bookmarks with category information
   */
  getAllBookmarksForTopic(topicId) {
    return selectors.selectAllBookmarksForTopic(store.getState(), topicId);
  }
  
  /**
   * Export bookmarks to a JSON file
   * 
   * @param {string} categoryId - Category ID
   * @returns {string} JSON string for download
   */
  async exportBookmarks(categoryId) {
    const bookmarks = this.getBookmarks(categoryId);
    return JSON.stringify({
      version: 1,
      categoryId,
      timestamp: Date.now(),
      bookmarks
    }, null, 2);
  }
  
  /**
   * Import bookmarks from a JSON file
   * 
   * @param {string} categoryId - Category ID to import into
   * @param {string} jsonData - JSON string with bookmarks
   * @returns {Array} Imported bookmarks
   */
  async importBookmarks(categoryId, jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
        throw new Error('Invalid bookmark import data');
      }
      
      const importedBookmarks = [];
      
      // Add each bookmark
      for (const bookmarkData of data.bookmarks) {
        // Make sure we have required fields
        if (!bookmarkData.title || !bookmarkData.url) {
          continue;
        }
        
        // Create the bookmark
        const bookmark = await this.createBookmark(
          bookmarkData.title,
          bookmarkData.url,
          categoryId
        );
        
        importedBookmarks.push(bookmark);
      }
      
      return importedBookmarks;
    } catch (error) {
      console.error('Error importing bookmarks:', error);
      throw error;
    }
  }
}

export default BookmarkService;
