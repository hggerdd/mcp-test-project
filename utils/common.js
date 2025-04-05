/**
 * Common utility functions used throughout the extension.
 */

/**
 * Generates a unique ID
 * 
 * @param {string} [prefix='id'] - Prefix for the ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safely parses JSON with error handling
 * 
 * @param {string} jsonString - JSON string to parse
 * @param {any} defaultValue - Default value to return on error
 * @returns {any} Parsed object or default value
 */
export function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
}

/**
 * Debounce function to limit how often a function can be called
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Escapes HTML characters to prevent XSS
 * 
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Gets a user-friendly date string from a timestamp
 * 
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted date string
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Checks if a URL is valid
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Shows a notification to the user
 * 
 * @param {string} message - Message to display
 * @param {string} [type='info'] - Type of notification ('info', 'success', 'warning', 'error')
 * @param {number} [duration=3000] - Duration in milliseconds
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // Create notification element if needed
  let notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1000;
    `;
    document.body.appendChild(notificationContainer);
  }
  
  // Create the notification
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    padding: 10px 15px;
    margin-bottom: 10px;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    animation: fadeIn 0.3s ease-out;
  `;
  
  // Set color based on type
  switch (type) {
    case 'success':
      notification.style.background = '#4CAF50';
      notification.style.color = 'white';
      break;
    case 'warning':
      notification.style.background = '#FFC107';
      notification.style.color = 'black';
      break;
    case 'error':
      notification.style.background = '#F44336';
      notification.style.color = 'white';
      break;
    default: // info
      notification.style.background = '#2196F3';
      notification.style.color = 'white';
  }
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Remove after duration
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    notification.addEventListener('animationend', () => {
      notificationContainer.removeChild(notification);
    });
  }, duration);
}
