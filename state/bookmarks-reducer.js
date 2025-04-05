/**
 * Bookmarks Reducer
 * 
 * Handles state updates related to bookmarks.
 * Bookmarks are stored in an object keyed by categoryId.
 */

import { ActionTypes } from './store.js';

/**
 * Reducer for the bookmarks slice of state
 * 
 * @param {object} state - Current bookmarks state
 * @param {object} action - Action object
 * @returns {object} New bookmarks state
 */
export function bookmarksReducer(state = {}, action) {
  switch (action.type) {
    case ActionTypes.ADD_BOOKMARK: {
      const { bookmark } = action.payload;
      const categoryId = bookmark.categoryId;
      
      // Initialize the array for this category if it doesn't exist
      const categoryBookmarks = state[categoryId] || [];
      
      return {
        ...state,
        [categoryId]: [...categoryBookmarks, bookmark]
      };
    }
    
    case ActionTypes.UPDATE_BOOKMARK: {
      const { bookmarkId, categoryId, updates } = action.payload;
      
      // If no bookmarks exist for this category, return unchanged state
      if (!state[categoryId]) {
        return state;
      }
      
      // Update the bookmark in the category's bookmarks array
      const updatedBookmarks = state[categoryId].map(bookmark => 
        bookmark.id === bookmarkId 
          ? { ...bookmark, ...updates, updatedAt: Date.now() } 
          : bookmark
      );
      
      return {
        ...state,
        [categoryId]: updatedBookmarks
      };
    }
    
    case ActionTypes.DELETE_BOOKMARK: {
      const { bookmarkId, categoryId } = action.payload;
      
      // If no bookmarks exist for this category, return unchanged state
      if (!state[categoryId]) {
        return state;
      }
      
      // Filter out the bookmark to delete
      const filteredBookmarks = state[categoryId].filter(
        bookmark => bookmark.id !== bookmarkId
      );
      
      return {
        ...state,
        [categoryId]: filteredBookmarks
      };
    }
    
    case ActionTypes.SET_BOOKMARKS: {
      const { categoryId, bookmarks } = action.payload;
      
      return {
        ...state,
        [categoryId]: [...bookmarks]
      };
    }
    
    case ActionTypes.DELETE_CATEGORY: {
      const { categoryId } = action.payload;
      
      // Create a new state object without the deleted category's bookmarks
      const newState = { ...state };
      delete newState[categoryId];
      
      return newState;
    }
    
    case ActionTypes.RESET_STATE: {
      return {};
    }
    
    default:
      return state;
  }
}
