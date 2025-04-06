/**
 * Central state management export file.
 * Configures and exports the complete state management system.
 */

import { store, createAction, ActionTypes } from './store.js';
import { topicsReducer, activeTopicIdReducer } from './topics-reducer.js';
import { categoriesReducer } from './categories-reducer.js';
import { bookmarksReducer } from './bookmarks-reducer.js';
import { categorySetsReducer } from './category-sets-reducer.js';
import { uiStateReducer } from './ui-reducer.js';
import { createStorageMiddleware } from './storage-middleware.js';
import { createLoggingMiddleware } from './logging-middleware.js';
import * as selectors from './selectors.js';
import * as actions from './actions.js';

// Register reducers
store.registerReducer('topics', topicsReducer);
store.registerReducer('activeTopicId', activeTopicIdReducer);
store.registerReducer('categories', categoriesReducer);
store.registerReducer('bookmarks', bookmarksReducer);
store.registerReducer('categorySets', categorySetsReducer);
store.registerReducer('uiState', uiStateReducer);

// Register middlewares
const isDebug = false; // Set to true for development, false for production
store.addMiddleware(createLoggingMiddleware({ 
  logActions: isDebug,
  logState: isDebug
}));
store.addMiddleware(createStorageMiddleware(browser));

/**
 * Initialize the state store from browser storage
 * 
 * @returns {Promise<void>}
 */
export async function initializeStore() {
  try {
    // Load topics
    const topicsResult = await browser.storage.local.get('topics');
    if (topicsResult.topics) {
      store.dispatch(createAction(ActionTypes.SET_TOPICS, { 
        topics: topicsResult.topics 
      }));
    }
    
    // Load active topic ID
    const activeTopicResult = await browser.storage.local.get('activeTopicId');
    if (activeTopicResult.activeTopicId) {
      store.dispatch(createAction(ActionTypes.SET_ACTIVE_TOPIC, { 
        topicId: activeTopicResult.activeTopicId 
      }));
    }
    
    // Load category sets
    const categorySetsResult = await browser.storage.local.get('categorySets');
    if (categorySetsResult.categorySets) {
      store.dispatch(createAction(ActionTypes.SET_CATEGORY_SETS, { 
        categorySets: categorySetsResult.categorySets 
      }));
    }
    
    // If we have topics, load categories and bookmarks for each
    if (topicsResult.topics && topicsResult.topics.length > 0) {
      for (const topic of topicsResult.topics) {
        // Load categories for this topic
        const categoriesResult = await browser.storage.local.get(`categories_${topic.id}`);
        if (categoriesResult[`categories_${topic.id}`]) {
          store.dispatch(createAction(ActionTypes.SET_CATEGORIES, {
            topicId: topic.id,
            categories: categoriesResult[`categories_${topic.id}`]
          }));
          
          // Load bookmarks for each category
          for (const category of categoriesResult[`categories_${topic.id}`]) {
            const bookmarksResult = await browser.storage.local.get(`bookmarks_${category.id}`);
            if (bookmarksResult[`bookmarks_${category.id}`]) {
              store.dispatch(createAction(ActionTypes.SET_BOOKMARKS, {
                categoryId: category.id,
                bookmarks: bookmarksResult[`bookmarks_${category.id}`]
              }));
            }
          }
        }
      }
    }
    
    // Mark as initialized
    store.dispatch(createAction(ActionTypes.SET_UI_STATE, {
      meta: {
        initialized: true,
        lastUpdated: Date.now()
      }
    }));
    
    console.log('Store initialized successfully');
  } catch (error) {
    console.error('Error initializing store:', error);
    throw error;
  }
}

/**
 * Get all topics
 * 
 * @returns {Array} List of topics
 */
export function getAllTopics() {
  return store.getState().topics;
}

/**
 * Get active topic
 * 
 * @returns {Object|null} Active topic or null
 */
export function getActiveTopic() {
  const state = store.getState();
  const activeTopicId = state.activeTopicId;
  
  if (!activeTopicId) return null;
  
  return state.topics.find(topic => topic.id === activeTopicId) || null;
}

/**
 * Get all categories for a topic
 * 
 * @param {string} topicId - Topic ID
 * @returns {Array} List of categories or empty array
 */
export function getCategoriesForTopic(topicId) {
  const state = store.getState();
  return state.categories[topicId] || [];
}

/**
 * Get all bookmarks for a category
 * 
 * @param {string} categoryId - Category ID
 * @returns {Array} List of bookmarks or empty array
 */
export function getBookmarksForCategory(categoryId) {
  const state = store.getState();
  return state.bookmarks[categoryId] || [];
}

/**
 * Get all category sets
 * 
 * @returns {Object} All category sets
 */
export function getAllCategorySets() {
  return store.getState().categorySets;
}

/**
 * Reset the store (mainly for testing)
 */
export function resetStore() {
  store.dispatch(createAction(ActionTypes.RESET_STATE));
}

// Export everything
export {
  store,
  createAction,
  ActionTypes,
  selectors,
  actions
};

export default {
  store,
  createAction,
  initializeStore,
  ActionTypes,
  getAllTopics,
  getActiveTopic,
  getCategoriesForTopic,
  getBookmarksForCategory,
  getAllCategorySets,
  resetStore,
  
  // Include all selectors and actions
  ...selectors,
  ...actions
};
