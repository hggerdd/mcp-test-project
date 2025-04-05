/**
 * State Management System
 * 
 * Implements a centralized state store with observer pattern for notification
 * of state changes. Follows a simplified Redux-like pattern with actions and reducers.
 */

import { safeJsonParse } from '../utils/common.js';

// Define action types
export const ActionTypes = {
  // Topic actions
  ADD_TOPIC: 'ADD_TOPIC',
  UPDATE_TOPIC: 'UPDATE_TOPIC',
  DELETE_TOPIC: 'DELETE_TOPIC',
  SET_ACTIVE_TOPIC: 'SET_ACTIVE_TOPIC',
  
  // Category actions
  ADD_CATEGORY: 'ADD_CATEGORY',
  UPDATE_CATEGORY: 'UPDATE_CATEGORY',
  DELETE_CATEGORY: 'DELETE_CATEGORY',
  
  // Category set actions
  ADD_CATEGORY_SET: 'ADD_CATEGORY_SET',
  UPDATE_CATEGORY_SET: 'UPDATE_CATEGORY_SET',
  DELETE_CATEGORY_SET: 'DELETE_CATEGORY_SET',
  
  // Bookmark actions
  ADD_BOOKMARK: 'ADD_BOOKMARK',
  UPDATE_BOOKMARK: 'UPDATE_BOOKMARK',
  DELETE_BOOKMARK: 'DELETE_BOOKMARK',
  
  // Batch actions
  SET_TOPICS: 'SET_TOPICS',
  SET_CATEGORIES: 'SET_CATEGORIES',
  SET_BOOKMARKS: 'SET_BOOKMARKS',
  SET_CATEGORY_SETS: 'SET_CATEGORY_SETS',
  
  // UI state actions
  SET_UI_STATE: 'SET_UI_STATE',
  TOGGLE_SIDEBAR_SECTION: 'TOGGLE_SIDEBAR_SECTION',
  
  // System actions
  INITIALIZE_STATE: 'INITIALIZE_STATE',
  PERSIST_STATE: 'PERSIST_STATE',
  IMPORT_STATE: 'IMPORT_STATE',
  RESET_STATE: 'RESET_STATE'
};

/**
 * Initial state object
 */
const initialState = {
  version: 1,
  topics: [],
  categories: {},  // Keyed by topicId
  bookmarks: {},   // Keyed by categoryId
  categorySets: {},
  activeTopicId: null,
  uiState: {
    sidebarSections: {
      topics: true,
      categories: true,
      bookmarks: true
    },
    selectedCategoryId: null,
    isLoading: false,
    errors: {},
  },
  meta: {
    lastUpdated: Date.now(),
    initialized: false,
    lastChanged: null  // Tracks which slice was last changed
  }
};

/**
 * Create a new action
 * 
 * @param {string} type - Action type from ActionTypes
 * @param {object} payload - Action payload
 * @returns {object} Action object
 */
export function createAction(type, payload = {}) {
  return {
    type,
    payload,
    meta: {
      timestamp: Date.now()
    }
  };
}

/**
 * Central store that manages state and notifies subscribers of changes
 */
export class Store {
  constructor(initialState) {
    this.state = { ...initialState };
    this.subscribers = [];
    this.reducers = {};
    this.middlewares = [];
    this.isDispatching = false;
    this.pendingActions = [];
  }
  
  /**
   * Get the current state
   * 
   * @returns {object} Current state
   */
  getState() {
    return this.state;
  }
  
  /**
   * Register a reducer function for a specific slice of state
   * 
   * @param {string} sliceName - Name of the state slice
   * @param {Function} reducer - Reducer function (state, action) => newState
   */
  registerReducer(sliceName, reducer) {
    this.reducers[sliceName] = reducer;
  }
  
  /**
   * Add a middleware function
   * 
   * @param {Function} middleware - Middleware function (store, action, next) => void
   */
  addMiddleware(middleware) {
    this.middlewares.push(middleware);
  }
  
  /**
   * Subscribe to state changes
   * 
   * @param {Function} callback - Function to call on state change
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Subscriber callback must be a function');
    }
    
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }
  
  /**
   * Dispatch an action to change state
   * 
   * @param {object} action - Action object with type and payload
   */
  dispatch(action) {
    if (!action || !action.type) {
      throw new Error('Actions must have a type');
    }
    
    // If already dispatching, queue the action
    if (this.isDispatching) {
      this.pendingActions.push(action);
      return;
    }
    
    try {
      this.isDispatching = true;
      
      // Apply middlewares
      let shouldContinue = true;
      for (const middleware of this.middlewares) {
        shouldContinue = middleware(this, action, shouldContinue);
        if (!shouldContinue) break;
      }
      
      if (shouldContinue) {
        // Create a new state object
        const newState = { ...this.state };
        
        // Track which slice was last changed
        let lastChanged = null;
        
        // Apply reducers for registered slices
        let stateChanged = false;
        
        for (const [sliceName, reducer] of Object.entries(this.reducers)) {
          const currentSliceState = this.state[sliceName];
          const newSliceState = reducer(currentSliceState, action);
          
          // Only update if the slice state actually changed
          if (newSliceState !== currentSliceState) {
            newState[sliceName] = newSliceState;
            stateChanged = true;
            lastChanged = sliceName;
          }
        }
        
        // Update meta information
        newState.meta = {
          ...newState.meta,
          lastUpdated: Date.now(),
          lastChanged: lastChanged
        };
        
        // Only update state and notify if changes were made
        if (stateChanged) {
          this.state = newState;
          this.notifySubscribers();
        }
      }
    } finally {
      this.isDispatching = false;
      
      // Process any pending actions
      if (this.pendingActions.length > 0) {
        const nextAction = this.pendingActions.shift();
        this.dispatch(nextAction);
      }
    }
  }
  
  /**
   * Notify all subscribers of state change
   */
  notifySubscribers() {
    for (const callback of this.subscribers) {
      try {
        callback(this.state);
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    }
  }
  
  /**
   * Reset the store to initial state
   */
  reset() {
    this.state = { ...initialState };
    this.notifySubscribers();
  }
}

// Create and export the global store instance
export const store = new Store(initialState);

export default store;
