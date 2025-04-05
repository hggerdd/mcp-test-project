/**
 * Logging Middleware
 * 
 * Provides logging for state changes.
 */

/**
 * Create a logging middleware
 * 
 * @param {object} options - Middleware options
 * @param {boolean} options.logActions - Whether to log actions
 * @param {boolean} options.logState - Whether to log state changes
 * @returns {Function} Middleware function
 */
export function createLoggingMiddleware(options = {}) {
  const { 
    logActions = true,
    logState = false,
    logger = console
  } = options;
  
  return function loggingMiddleware(store, action, next) {
    if (logActions) {
      logger.group(`%cAction: ${action.type}`, 'color: #738ADB; font-weight: bold');
      logger.log('%cAction:', 'color: #738ADB; font-weight: bold', action);
      
      if (logState) {
        logger.log('%cPrevious State:', 'color: #9E9E9E; font-weight: bold', store.getState());
      }
      
      const result = next;
      
      if (logState) {
        logger.log('%cNext State:', 'color: #4CAF50; font-weight: bold', store.getState());
      }
      
      logger.groupEnd();
      return result;
    }
    
    return next;
  };
}

export default createLoggingMiddleware;
