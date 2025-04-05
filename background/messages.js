/**
 * Centralized message type definitions to ensure consistency
 * across different components of the extension.
 */

export const MessageTypes = {
  // Topic management
  ADD_TOPIC_REQUEST: 'addTopicRequest',
  ADD_TOPIC_RESPONSE: 'addTopicResponse',
  MODAL_RESPONSE: 'modalResponse',
  MODAL_ERROR: 'modalError',
  
  // Category set management
  CATEGORY_SET_UPDATE: 'categorySetUpdate',
  
  // Tab management
  GET_CURRENT_TAB: 'getCurrentTab',
  SWITCH_TOPIC: 'switchTopic',
  
  // General data operations
  SAVE_DATA: 'saveData',
  LOAD_DATA: 'loadData',
  DATA_UPDATED: 'dataUpdated'
};

/**
 * Creates a message object with the specified type and data
 * 
 * @param {string} type - The message type from MessageTypes
 * @param {object} data - The data to include in the message
 * @returns {object} The formatted message
 */
export function createMessage(type, data = {}) {
  return {
    type,
    ...data,
    timestamp: Date.now()
  };
}

/**
 * Sends a message to the background script
 * 
 * @param {string} type - The message type from MessageTypes
 * @param {object} data - The data to include in the message
 * @returns {Promise<any>} Response from the background script
 */
export async function sendMessage(type, data = {}) {
  const message = createMessage(type, data);
  
  try {
    return await browser.runtime.sendMessage(message);
  } catch (error) {
    console.error(`Error sending message of type ${type}:`, error);
    throw error;
  }
}

/**
 * Returns true if the message object has the expected type
 * 
 * @param {object} message - The message to check
 * @param {string} type - The expected message type
 * @returns {boolean} True if the message is of the expected type
 */
export function isMessageType(message, type) {
  return message && message.type === type;
}