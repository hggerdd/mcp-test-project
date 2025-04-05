/**
 * Background script - handles communication between extension components
 * and manages global extension state
 */

// Import services
import { StorageService } from '../services/storage-service.js';
import { MessageTypes } from './messages.js';

// Initialize services
const storageService = new StorageService();

/**
 * Handle communication between extension components
 */
browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log('Background received message:', message.type);
  
  try {
    switch (message.type) {
      case MessageTypes.ADD_TOPIC_RESPONSE:
        // Forward the complete message structure to sidebar
        return browser.runtime.sendMessage({
          type: MessageTypes.MODAL_RESPONSE,
          success: message.success,
          topicName: message.topicName,
          categorySet: message.categorySet
        });
        
      case MessageTypes.CATEGORY_SET_UPDATE:
        // Forward category set updates to any listeners
        return browser.runtime.sendMessage({
          type: MessageTypes.CATEGORY_SET_UPDATE,
          categorySets: message.categorySets
        });
        
      case MessageTypes.GET_CURRENT_TAB:
        // Get the current active tab
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0) {
          return { url: tabs[0].url, title: tabs[0].title };
        }
        return null;
        
      default:
        console.log('Unhandled message type:', message.type);
        return null;
    }
  } catch (error) {
    console.error('Error in background message handler:', error);
    return { error: error.message };
  }
});

console.log('Background script loaded.');
