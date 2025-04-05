/**
 * Category Sets Reducer
 * 
 * Handles state updates related to category sets.
 */

import { ActionTypes } from './store.js';

/**
 * Reducer for the categorySets slice of state
 * 
 * @param {object} state - Current categorySets state
 * @param {object} action - Action object
 * @returns {object} New categorySets state
 */
export function categorySetsReducer(state = {}, action) {
  switch (action.type) {
    case ActionTypes.ADD_CATEGORY_SET: {
      const { categorySet } = action.payload;
      
      return {
        ...state,
        [categorySet.id]: categorySet
      };
    }
    
    case ActionTypes.UPDATE_CATEGORY_SET: {
      const { categorySetId, updates } = action.payload;
      
      // If the category set doesn't exist, return unchanged state
      if (!state[categorySetId]) {
        return state;
      }
      
      // Update the category set
      return {
        ...state,
        [categorySetId]: {
          ...state[categorySetId],
          ...updates,
          updatedAt: Date.now()
        }
      };
    }
    
    case ActionTypes.DELETE_CATEGORY_SET: {
      const { categorySetId } = action.payload;
      
      // Create a new state object without the deleted category set
      const newState = { ...state };
      delete newState[categorySetId];
      
      return newState;
    }
    
    case ActionTypes.SET_CATEGORY_SETS: {
      const { categorySets } = action.payload;
      
      // Replace the entire category sets object
      return { ...categorySets };
    }
    
    case ActionTypes.RESET_STATE: {
      return {};
    }
    
    default:
      return state;
  }
}
