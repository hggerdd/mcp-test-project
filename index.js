/**
 * Central exports file to simplify importing services and utilities.
 * This allows for cleaner imports in the various components.
 */

// Models
export { createTopic, validateTopic } from './models/topic.js';
export { createCategory, validateCategory, createCategorySet } from './models/category.js';
export { createBookmark, validateBookmark, createBookmarkFromTab } from './models/bookmark.js';

// Services
export { StorageService } from './services/storage-service.js';
export { TopicService } from './services/topic-service.js';
export { CategoryService } from './services/category-service.js';
export { BookmarkService } from './services/bookmark-service.js';

// Messaging
export { 
  MessageTypes, 
  createMessage, 
  sendMessage, 
  isMessageType 
} from './background/messages.js';

// Utilities
export {
  generateId,
  safeJsonParse,
  debounce,
  escapeHtml,
  formatDate,
  isValidUrl,
  showNotification
} from './utils/common.js';

export {
  $,
  $$,
  createElement,
  clearElement,
  showElement,
  hideElement,
  toggleElement,
  addEventListenerToAll,
  createModal
} from './utils/dom-utils.js';

// State Management
export {
  store,
  createAction,
  ActionTypes,
  initializeStore,
  selectors,
  actions
} from './state/index.js';

// Tab Management
export { TabIdentifier } from './utils/tab-identifier.js';
