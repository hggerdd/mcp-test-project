/**
 * Error types for the application.
 * 
 * Defines standardized error types that can be used throughout the application.
 */

// Error severity levels
export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Error categories
export const ErrorCategory = {
  VALIDATION: 'validation',
  STORAGE: 'storage',
  NETWORK: 'network',
  TABS: 'tabs',
  BOOKMARKS: 'bookmarks',
  CATEGORIES: 'categories',
  TOPICS: 'topics',
  UI: 'ui',
  GENERAL: 'general'
};

/**
 * Base application error class
 */
export class AppError extends Error {
  /**
   * Create a new application error
   * 
   * @param {string} message - Error message
   * @param {string} category - Error category
   * @param {string} severity - Error severity
   * @param {object} [details={}] - Additional error details
   */
  constructor(message, category = ErrorCategory.GENERAL, severity = ErrorSeverity.ERROR, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.details = details;
    this.timestamp = Date.now();
    
    // Support for Firefox feature to keep the stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Get a user-friendly error message
   * 
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    return this.message;
  }
  
  /**
   * Serialize the error to a simple object
   * 
   * @returns {object} Serialized error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  /**
   * Create a validation error
   * 
   * @param {string} message - Error message
   * @param {object} [details={}] - Validation details
   */
  constructor(message, details = {}) {
    super(message, ErrorCategory.VALIDATION, ErrorSeverity.WARNING, details);
  }
  
  /**
   * Get a user-friendly error message
   * 
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    return `Validation failed: ${this.message}`;
  }
}

/**
 * Storage error
 */
export class StorageError extends AppError {
  /**
   * Create a storage error
   * 
   * @param {string} message - Error message
   * @param {object} [details={}] - Storage details
   */
  constructor(message, details = {}) {
    super(message, ErrorCategory.STORAGE, ErrorSeverity.ERROR, details);
  }
  
  /**
   * Get a user-friendly error message
   * 
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    return `Storage operation failed: ${this.message}`;
  }
}

/**
 * Network error
 */
export class NetworkError extends AppError {
  /**
   * Create a network error
   * 
   * @param {string} message - Error message
   * @param {object} [details={}] - Network details
   */
  constructor(message, details = {}) {
    super(message, ErrorCategory.NETWORK, ErrorSeverity.ERROR, details);
  }
  
  /**
   * Get a user-friendly error message
   * 
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    return `Network operation failed: ${this.message}`;
  }
}

/**
 * Tab operation error
 */
export class TabError extends AppError {
  /**
   * Create a tab error
   * 
   * @param {string} message - Error message
   * @param {object} [details={}] - Tab details
   */
  constructor(message, details = {}) {
    super(message, ErrorCategory.TABS, ErrorSeverity.WARNING, details);
  }
  
  /**
   * Get a user-friendly error message
   * 
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    return `Tab operation failed: ${this.message}`;
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  /**
   * Create a not found error
   * 
   * @param {string} entityType - Type of entity not found
   * @param {string} identifier - Entity identifier
   */
  constructor(entityType, identifier) {
    super(`${entityType} not found: ${identifier}`, ErrorCategory.GENERAL, ErrorSeverity.WARNING, {
      entityType,
      identifier
    });
  }
  
  /**
   * Get a user-friendly error message
   * 
   * @returns {string} User-friendly error message
   */
  getUserMessage() {
    return `Could not find the requested ${this.details.entityType}`;
  }
}
