/**
 * Topic Reducer
 * 
 * Handles state updates related to topics.
 */

import { ActionTypes } from './store.js';

/**
 * Reducer for the topics slice of state
 * 
 * @param {Array} state - Current topics state
 * @param {object} action - Action object
 * @returns {Array} New topics state
 */
export function topicsReducer(state = [], action) {
  switch (action.type) {
    case ActionTypes.ADD_TOPIC: {
      return [...state, action.payload.topic];
    }
    
    case ActionTypes.UPDATE_TOPIC: {
      const { topicId, updates } = action.payload;
      return state.map(topic => 
        topic.id === topicId 
          ? { ...topic, ...updates, updatedAt: Date.now() } 
          : topic
      );
    }
    
    case ActionTypes.DELETE_TOPIC: {
      const { topicId } = action.payload;
      return state.filter(topic => topic.id !== topicId);
    }
    
    case ActionTypes.SET_TOPICS: {
      return [...action.payload.topics];
    }
    
    case ActionTypes.RESET_STATE: {
      return [];
    }
    
    default:
      return state;
  }
}

/**
 * Reducer for the activeTopicId slice of state
 * 
 * @param {string|null} state - Current activeTopicId state
 * @param {object} action - Action object
 * @returns {string|null} New activeTopicId state
 */
export function activeTopicIdReducer(state = null, action) {
  switch (action.type) {
    case ActionTypes.SET_ACTIVE_TOPIC: {
      return action.payload.topicId;
    }
    
    case ActionTypes.DELETE_TOPIC: {
      // If the active topic is deleted, reset to null
      return state === action.payload.topicId ? null : state;
    }
    
    case ActionTypes.RESET_STATE: {
      return null;
    }
    
    default:
      return state;
  }
}
