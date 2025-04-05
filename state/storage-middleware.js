/**
 * Storage Middleware
 * 
 * Handles persisting state changes to browser storage.
 */

import { ActionTypes } from './store.js';

/**
 * List of actions that should trigger state persistence
 */
const PERSIST_ACTIONS = [
  ActionTypes.ADD_TOPIC,
  ActionTypes.UPDATE_TOPIC,
  ActionTypes.DELETE_TOPIC,
  ActionTypes.SET_TOPICS,
  ActionTypes.SET_ACTIVE_TOPIC,
  
  ActionTypes.ADD_CATEGORY,
  ActionTypes.UPDATE_CATEGORY,
  ActionTypes.DELETE_CATEGORY,
  ActionTypes.SET_CATEGORIES,
  
  ActionTypes.ADD_BOOKMARK,
  ActionTypes.UPDATE_BOOKMARK,
  ActionTypes.DELETE_BOOKMARK,
  ActionTypes.SET_BOOKMARKS,
  
  ActionTypes.ADD_CATEGORY_SET,
  ActionTypes.UPDATE_CATEGORY_SET,
  ActionTypes.DELETE_CATEGORY_SET,
  ActionTypes.SET_CATEGORY_SETS,
  
  ActionTypes.PERSIST_STATE
];

/**
 * Create a storage middleware
 * 
 * @param {object} browser - Browser API object
 * @returns {Function} Middleware function
 */
export function createStorageMiddleware(browser) {
  return function storageMiddleware(store, action, next) {
    // Let the action pass through first
    const result = next;
    
    // If this action should trigger persistence
    if (PERSIST_ACTIONS.includes(action.type)) {
      const state = store.getState();
      
      // Persist relevant parts of the state
      const persistData = async () => {
        try {
          // Persist topics
          if (action.type.includes('TOPIC') || action.type === ActionTypes.PERSIST_STATE) {
            await browser.storage.local.set({ 
              topics: state.topics,
              activeTopicId: state.activeTopicId
            });
          }
          
          // Persist categories (only for the affected topic)
          if (action.type.includes('CATEGORY') && action.type !== ActionTypes.ADD_CATEGORY_SET && 
              action.type !== ActionTypes.UPDATE_CATEGORY_SET && 
              action.type !== ActionTypes.DELETE_CATEGORY_SET) {
            
            let topicId = null;
            
            if (action.payload.topicId) {
              topicId = action.payload.topicId;
            } else if (action.payload.category && action.payload.category.topicId) {
              topicId = action.payload.category.topicId;
            }
            
            if (topicId && state.categories[topicId]) {
              await browser.storage.local.set({ 
                [`categories_${topicId}`]: state.categories[topicId]
              });
            }
          }
          
          // Persist bookmarks (only for the affected category)
          if (action.type.includes('BOOKMARK')) {
            let categoryId = null;
            
            if (action.payload.categoryId) {
              categoryId = action.payload.categoryId;
            } else if (action.payload.bookmark && action.payload.bookmark.categoryId) {
              categoryId = action.payload.bookmark.categoryId;
            }
            
            if (categoryId && state.bookmarks[categoryId]) {
              await browser.storage.local.set({ 
                [`bookmarks_${categoryId}`]: state.bookmarks[categoryId]
              });
            }
          }
          
          // Persist category sets
          if (action.type.includes('CATEGORY_SET') || action.type === ActionTypes.PERSIST_STATE) {
            await browser.storage.local.set({ 
              categorySets: state.categorySets
            });
          }
          
        } catch (error) {
          console.error('Error persisting state:', error);
        }
      };
      
      // Don't wait for the async operation
      persistData();
    }
    
    return result;
  };
}

export default createStorageMiddleware;
