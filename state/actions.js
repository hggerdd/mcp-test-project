/**
 * Action creators for the state store.
 * 
 * These functions create standardized actions that can be dispatched to the store.
 */

import { createAction, ActionTypes } from './store.js';
import { generateId } from '../utils/common.js';

// Topic Actions

/**
 * Create a new topic
 * 
 * @param {string} name - Topic name
 * @returns {object} Action object
 */
export function addTopic(name) {
  const topic = {
    id: generateId('topic'),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  return createAction(ActionTypes.ADD_TOPIC, { topic });
}

/**
 * Update an existing topic
 * 
 * @param {string} topicId - ID of the topic to update
 * @param {object} updates - Properties to update
 * @returns {object} Action object
 */
export function updateTopic(topicId, updates) {
  return createAction(ActionTypes.UPDATE_TOPIC, { topicId, updates });
}

/**
 * Delete a topic
 * 
 * @param {string} topicId - ID of the topic to delete
 * @returns {object} Action object
 */
export function deleteTopic(topicId) {
  return createAction(ActionTypes.DELETE_TOPIC, { topicId });
}

/**
 * Set the active topic
 * 
 * @param {string} topicId - ID of the topic to set as active
 * @returns {object} Action object
 */
export function setActiveTopic(topicId) {
  return createAction(ActionTypes.SET_ACTIVE_TOPIC, { topicId });
}

// Category Actions

/**
 * Create a new category
 * 
 * @param {string} name - Category name
 * @param {string} topicId - Topic ID this category belongs to
 * @returns {object} Action object
 */
export function addCategory(name, topicId) {
  const category = {
    id: generateId('category'),
    name,
    topicId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  return createAction(ActionTypes.ADD_CATEGORY, { category });
}

/**
 * Update an existing category
 * 
 * @param {string} categoryId - ID of the category to update
 * @param {string} topicId - Topic ID this category belongs to
 * @param {object} updates - Properties to update
 * @returns {object} Action object
 */
export function updateCategory(categoryId, topicId, updates) {
  return createAction(ActionTypes.UPDATE_CATEGORY, { categoryId, topicId, updates });
}

/**
 * Delete a category
 * 
 * @param {string} categoryId - ID of the category to delete
 * @param {string} topicId - Topic ID this category belongs to
 * @returns {object} Action object
 */
export function deleteCategory(categoryId, topicId) {
  return createAction(ActionTypes.DELETE_CATEGORY, { categoryId, topicId });
}

// Bookmark Actions

/**
 * Create a new bookmark
 * 
 * @param {string} title - Bookmark title
 * @param {string} url - Bookmark URL
 * @param {string} categoryId - Category ID this bookmark belongs to
 * @returns {object} Action object
 */
export function addBookmark(title, url, categoryId) {
  const bookmark = {
    id: generateId('bookmark'),
    title,
    url,
    categoryId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  return createAction(ActionTypes.ADD_BOOKMARK, { bookmark });
}

/**
 * Update an existing bookmark
 * 
 * @param {string} bookmarkId - ID of the bookmark to update
 * @param {string} categoryId - Category ID this bookmark belongs to
 * @param {object} updates - Properties to update
 * @returns {object} Action object
 */
export function updateBookmark(bookmarkId, categoryId, updates) {
  return createAction(ActionTypes.UPDATE_BOOKMARK, { bookmarkId, categoryId, updates });
}

/**
 * Delete a bookmark
 * 
 * @param {string} bookmarkId - ID of the bookmark to delete
 * @param {string} categoryId - Category ID this bookmark belongs to
 * @returns {object} Action object
 */
export function deleteBookmark(bookmarkId, categoryId) {
  return createAction(ActionTypes.DELETE_BOOKMARK, { bookmarkId, categoryId });
}

// Category Set Actions

/**
 * Create a new category set
 * 
 * @param {string} name - Category set name
 * @param {Array<string>} categories - List of category names
 * @returns {object} Action object
 */
export function addCategorySet(name, categories = []) {
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const categorySet = {
    id,
    name,
    categories,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  return createAction(ActionTypes.ADD_CATEGORY_SET, { categorySet });
}

/**
 * Update an existing category set
 * 
 * @param {string} categorySetId - ID of the category set to update
 * @param {object} updates - Properties to update
 * @returns {object} Action object
 */
export function updateCategorySet(categorySetId, updates) {
  return createAction(ActionTypes.UPDATE_CATEGORY_SET, { categorySetId, updates });
}

/**
 * Delete a category set
 * 
 * @param {string} categorySetId - ID of the category set to delete
 * @returns {object} Action object
 */
export function deleteCategorySet(categorySetId) {
  return createAction(ActionTypes.DELETE_CATEGORY_SET, { categorySetId });
}

// UI Actions

/**
 * Update UI state
 * 
 * @param {object} uiStateUpdates - UI state properties to update
 * @returns {object} Action object
 */
export function updateUiState(uiStateUpdates) {
  return createAction(ActionTypes.SET_UI_STATE, uiStateUpdates);
}

/**
 * Toggle visibility of a sidebar section
 * 
 * @param {string} sectionName - Name of the section to toggle
 * @returns {object} Action object
 */
export function toggleSidebarSection(sectionName) {
  return createAction(ActionTypes.TOGGLE_SIDEBAR_SECTION, { sectionName });
}

// Batch and system actions

/**
 * Force persisting state to storage
 * 
 * @returns {object} Action object
 */
export function persistState() {
  return createAction(ActionTypes.PERSIST_STATE);
}

/**
 * Reset the entire state
 * 
 * @returns {object} Action object
 */
export function resetState() {
  return createAction(ActionTypes.RESET_STATE);
}

// Export all action creators
export default {
  addTopic,
  updateTopic,
  deleteTopic,
  setActiveTopic,
  
  addCategory,
  updateCategory,
  deleteCategory,
  
  addBookmark,
  updateBookmark,
  deleteBookmark,
  
  addCategorySet,
  updateCategorySet,
  deleteCategorySet,
  
  updateUiState,
  toggleSidebarSection,
  
  persistState,
  resetState
};
