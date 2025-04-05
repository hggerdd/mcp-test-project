/**
 * Categories Reducer
 * 
 * Handles state updates related to categories.
 * Categories are stored in an object keyed by topicId.
 */

import { ActionTypes } from './store.js';

/**
 * Reducer for the categories slice of state
 * 
 * @param {object} state - Current categories state
 * @param {object} action - Action object
 * @returns {object} New categories state
 */
export function categoriesReducer(state = {}, action) {
  switch (action.type) {
    case ActionTypes.ADD_CATEGORY: {
      const { category } = action.payload;
      const topicId = category.topicId;
      
      // Initialize the array for this topic if it doesn't exist
      const topicCategories = state[topicId] || [];
      
      return {
        ...state,
        [topicId]: [...topicCategories, category]
      };
    }
    
    case ActionTypes.UPDATE_CATEGORY: {
      const { categoryId, topicId, updates } = action.payload;
      
      // If no categories exist for this topic, return unchanged state
      if (!state[topicId]) {
        return state;
      }
      
      // Update the category in the topic's categories array
      const updatedCategories = state[topicId].map(category => 
        category.id === categoryId 
          ? { ...category, ...updates, updatedAt: Date.now() } 
          : category
      );
      
      return {
        ...state,
        [topicId]: updatedCategories
      };
    }
    
    case ActionTypes.DELETE_CATEGORY: {
      const { categoryId, topicId } = action.payload;
      
      // If no categories exist for this topic, return unchanged state
      if (!state[topicId]) {
        return state;
      }
      
      // Filter out the category to delete
      const filteredCategories = state[topicId].filter(
        category => category.id !== categoryId
      );
      
      return {
        ...state,
        [topicId]: filteredCategories
      };
    }
    
    case ActionTypes.SET_CATEGORIES: {
      const { topicId, categories } = action.payload;
      
      return {
        ...state,
        [topicId]: [...categories]
      };
    }
    
    case ActionTypes.DELETE_TOPIC: {
      const { topicId } = action.payload;
      
      // Create a new state object without the deleted topic's categories
      const newState = { ...state };
      delete newState[topicId];
      
      return newState;
    }
    
    case ActionTypes.RESET_STATE: {
      return {};
    }
    
    default:
      return state;
  }
}
