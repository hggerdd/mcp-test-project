/**
 * DOM utility functions for working with the browser DOM.
 */

/**
 * Shorthand for document.querySelector
 * 
 * @param {string} selector - CSS selector
 * @param {Element} [parent=document] - Parent element
 * @returns {Element|null} Found element or null
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Shorthand for document.querySelectorAll
 * 
 * @param {string} selector - CSS selector
 * @param {Element} [parent=document] - Parent element
 * @returns {NodeList} List of matching elements
 */
export function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

/**
 * Creates an element with attributes and children
 * 
 * @param {string} tag - HTML tag name
 * @param {Object} [attributes={}] - HTML attributes
 * @param {Array|string} [children=[]] - Child elements or text content
 * @returns {Element} Created element
 */
export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.entries(value).forEach(([styleKey, styleValue]) => {
        element.style[styleKey] = styleValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Handle event listeners
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Add children
  if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });
  } else if (typeof children === 'string') {
    element.textContent = children;
  }
  
  return element;
}

/**
 * Removes all child elements from an element
 * 
 * @param {Element} element - Element to clear
 */
export function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Shows an element
 * 
 * @param {Element} element - Element to show
 * @param {string} [displayValue='block'] - CSS display value
 */
export function showElement(element, displayValue = 'block') {
  element.style.display = displayValue;
}

/**
 * Hides an element
 * 
 * @param {Element} element - Element to hide
 */
export function hideElement(element) {
  element.style.display = 'none';
}

/**
 * Toggles element visibility
 * 
 * @param {Element} element - Element to toggle
 * @param {string} [displayValue='block'] - CSS display value when shown
 */
export function toggleElement(element, displayValue = 'block') {
  if (element.style.display === 'none') {
    element.style.display = displayValue;
  } else {
    element.style.display = 'none';
  }
}

/**
 * Adds event listener to all matching elements
 * 
 * @param {string} selector - CSS selector
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Element} [parent=document] - Parent element
 */
export function addEventListenerToAll(selector, event, handler, parent = document) {
  const elements = parent.querySelectorAll(selector);
  elements.forEach(element => {
    element.addEventListener(event, handler);
  });
}

/**
 * Creates and shows a simple modal dialog
 * 
 * @param {string} title - Modal title
 * @param {string|Element} content - Modal content (text or element)
 * @param {Object} [options={}] - Additional options
 * @returns {Object} Modal controller with show, hide, and getElement methods
 */
export function createModal(title, content, options = {}) {
  const modalId = options.id || 'modal-' + Date.now();
  
  // Create modal structure
  const modalOverlay = createElement('div', {
    id: `${modalId}-overlay`,
    className: 'modal-overlay',
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'none',
      zIndex: '1000',
      justifyContent: 'center',
      alignItems: 'center'
    }
  });
  
  const modalElement = createElement('div', {
    id: modalId,
    className: 'modal',
    style: {
      backgroundColor: 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
      width: options.width || '400px',
      maxWidth: '90%',
      maxHeight: '90%',
      overflow: 'auto'
    }
  });
  
  const modalHeader = createElement('div', {
    className: 'modal-header',
    style: {
      padding: '10px 15px',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, [
    createElement('h3', {
      style: {
        margin: 0,
        fontSize: '1.2em'
      }
    }, title),
    createElement('button', {
      className: 'modal-close',
      style: {
        background: 'none',
        border: 'none',
        fontSize: '1.5em',
        cursor: 'pointer'
      },
      onclick: () => controller.hide()
    }, '×')
  ]);
  
  const modalBody = createElement('div', {
    className: 'modal-body',
    style: {
      padding: '15px'
    }
  }, typeof content === 'string' ? content : [content]);
  
  modalElement.appendChild(modalHeader);
  modalElement.appendChild(modalBody);
  modalOverlay.appendChild(modalElement);
  
  // Create controller
  const controller = {
    show() {
      document.body.appendChild(modalOverlay);
      modalOverlay.style.display = 'flex';
      
      // Add keyboard event listener
      document.addEventListener('keydown', this.handleKeyDown);
      
      // Focus first input if available
      const firstInput = modalElement.querySelector('input, button:not(.modal-close)');
      if (firstInput) {
        firstInput.focus();
      }
      
      return this;
    },
    
    hide() {
      modalOverlay.style.display = 'none';
      
      // Remove keyboard event listener
      document.removeEventListener('keydown', this.handleKeyDown);
      
      if (modalOverlay.parentNode) {
        modalOverlay.parentNode.removeChild(modalOverlay);
      }
      
      return this;
    },
    
    getElement() {
      return modalElement;
    },
    
    handleKeyDown(event) {
      if (event.key === 'Escape') {
        controller.hide();
      }
    }
  };
  
  // Handle clicks outside the modal
  if (options.closeOnOverlayClick !== false) {
    modalOverlay.addEventListener('click', (event) => {
      if (event.target === modalOverlay) {
        controller.hide();
      }
    });
  }
  
  return controller;
}
