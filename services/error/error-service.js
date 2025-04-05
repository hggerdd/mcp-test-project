/**
 * ErrorService provides centralized error handling for the application.
 * 
 * It logs errors, displays user-friendly notifications, and tracks error
 * statistics for improved debugging.
 */

import { store, actions } from '../../state/index.js';
import { AppError, ErrorSeverity } from './error-types.js';
import { showNotification } from '../../utils/common.js';

// Maximum number of errors to keep in history
const MAX_ERROR_HISTORY = 100;

export class ErrorService {
  constructor() {
    this.errorHistory = [];
    this.errorStats = {
      total: 0,
      byCategory: {},
      bySeverity: {}
    };
  }
  
  /**
   * Handle an error
   * 
   * @param {Error} error - The error to handle
   * @param {object} options - Handling options
   * @param {boolean} options.silent - Whether to silence user notifications
   * @param {boolean} options.rethrow - Whether to rethrow the error
   * @returns {AppError} The handled error
   */
  handleError(error, options = {}) {
    const { silent = false, rethrow = false } = options;
    
    // Convert to AppError if needed
    const appError = this._normalizeError(error);
    
    // Log the error
    this._logError(appError);
    
    // Track error statistics
    this._trackError(appError);
    
    // Store in history
    this._addToHistory(appError);
    
    // Show notification if not silent
    if (!silent) {
      this._notifyUser(appError);
    }
    
    // Update UI state if needed
    this._updateErrorState(appError);
    
    // Rethrow if requested
    if (rethrow) {
      throw appError;
    }
    
    return appError;
  }
  
  /**
   * Get error history
   * 
   * @returns {Array} Error history
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }
  
  /**
   * Get error statistics
   * 
   * @returns {object} Error statistics
   */
  getErrorStats() {
    return { ...this.errorStats };
  }
  
  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }
  
  /**
   * Reset error statistics
   */
  resetErrorStats() {
    this.errorStats = {
      total: 0,
      byCategory: {},
      bySeverity: {}
    };
  }
  
  /**
   * Normalize an error to an AppError
   * 
   * @private
   * @param {Error} error - Error to normalize
   * @returns {AppError} Normalized error
   */
  _normalizeError(error) {
    if (error instanceof AppError) {
      return error;
    }
    
    // Convert native Error to AppError
    return new AppError(
      error.message || 'An unknown error occurred',
      'general',
      ErrorSeverity.ERROR,
      { originalError: error }
    );
  }
  
  /**
   * Log an error to the console
   * 
   * @private
   * @param {AppError} error - Error to log
   */
  _logError(error) {
    const { severity } = error;
    
    switch (severity) {
      case ErrorSeverity.INFO:
        console.log(`[${error.category}]`, error.message, error);
        break;
      case ErrorSeverity.WARNING:
        console.warn(`[${error.category}]`, error.message, error);
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        console.error(`[${error.category}]`, error.message, error);
        break;
      default:
        console.error(`[${error.category}]`, error.message, error);
    }
  }
  
  /**
   * Track error statistics
   * 
   * @private
   * @param {AppError} error - Error to track
   */
  _trackError(error) {
    const { category, severity } = error;
    
    // Increment total errors
    this.errorStats.total++;
    
    // Increment category count
    this.errorStats.byCategory[category] = (this.errorStats.byCategory[category] || 0) + 1;
    
    // Increment severity count
    this.errorStats.bySeverity[severity] = (this.errorStats.bySeverity[severity] || 0) + 1;
  }
  
  /**
   * Add error to history
   * 
   * @private
   * @param {AppError} error - Error to add
   */
  _addToHistory(error) {
    // Add to history
    this.errorHistory.unshift(error);
    
    // Trim history if needed
    if (this.errorHistory.length > MAX_ERROR_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, MAX_ERROR_HISTORY);
    }
  }
  
  /**
   * Show error notification to user
   * 
   * @private
   * @param {AppError} error - Error to notify about
   */
  _notifyUser(error) {
    const { severity } = error;
    const userMessage = error.getUserMessage();
    
    // Map severity to notification type
    let notificationType = 'info';
    switch (severity) {
      case ErrorSeverity.INFO:
        notificationType = 'info';
        break;
      case ErrorSeverity.WARNING:
        notificationType = 'warning';
        break;
      case ErrorSeverity.ERROR:
      case ErrorSeverity.CRITICAL:
        notificationType = 'error';
        break;
    }
    
    // Show notification
    showNotification(userMessage, notificationType, severity === ErrorSeverity.CRITICAL ? 6000 : 3000);
  }
  
  /**
   * Update error state in the UI
   * 
   * @private
   * @param {AppError} error - Error that occurred
   */
  _updateErrorState(error) {
    // Only update state for error and critical severities
    if (error.severity === ErrorSeverity.ERROR || error.severity === ErrorSeverity.CRITICAL) {
      store.dispatch(actions.updateUiState({
        errors: {
          ...store.getState().uiState.errors,
          [error.category]: {
            message: error.getUserMessage(),
            timestamp: error.timestamp
          }
        }
      }));
    }
  }
}

// Create singleton instance
const errorService = new ErrorService();

export default errorService;
