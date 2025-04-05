/**
 * UI State Reducer
 * 
 * Handles state updates related to the UI.
 */

import { ActionTypes } from './store.js';

// Initial UI state
const initialUiState = {
  sidebarSections: {
    topics: true,
    categories: true,
    bookmarks: true
  },
  selectedCategoryId: null,
  isLoading: false,
  errors: {}
};

/**
 * Reducer for the uiState slice of state
 * 
 * @param {object} state - Current uiState
 * @param {object} action - Action object
 * @returns {object} New uiState
 */
export function uiStateReducer(state = initialUiState, action) {
  switch (action.type) {
    case ActionTypes.SET_UI_STATE: {
      return {
        ...state,
        ...action.payload
      };
    }
    
    case ActionTypes.TOGGLE_SIDEBAR_SECTION: {
      const { sectionName } = action.payload;
      
      return {
        ...state,
        sidebarSections: {
          ...state.sidebarSections,
          [sectionName]: !state.sidebarSections[sectionName]
        }
      };
    }
    
    // When a category is deleted, unselect it if it's currently selected
    case ActionTypes.DELETE_CATEGORY: {
      const { categoryId } = action.payload;
      
      if (state.selectedCategoryId === categoryId) {
        return {
          ...state,
          selectedCategoryId: null
        };
      }
      
      return state;
    }
    
    // When a topic is deleted, reset the selected category
    case ActionTypes.DELETE_TOPIC: {
      return {
        ...state,
        selectedCategoryId: null
      };
    }
    
    case ActionTypes.RESET_STATE: {
      return initialUiState;
    }
    
    default:
      return state;
  }
}
