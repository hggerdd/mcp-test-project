/**
 * State-Integrated Category Manager
 * 
 * This version of the category manager uses the centralized state management system
 * instead of directly manipulating the storage.
 */

import { 
  store,
  actions,
  selectors,
  CategoryService,
  showNotification
} from '../../../index.js';

export class StateCategoryManager {
  constructor(elements) {
    this.elements = elements;
    this.categoryService = new CategoryService();
    this.callbacks = {
      onCategorySelect: null,
      onCategoryEdit: null,
      onCategoryDelete: null
    };

    // Set up store subscription
    this.unsubscribe = store.subscribe(this.handleStateChange.bind(this));
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  /**
   * Handle state changes from the store
   */
  handleStateChange(state) {
    // Only re-render if active topic or categories changed
    this.renderCategories();
  }

  /**
   * Set callbacks for handling user interactions
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get active topic ID
   */
  getActiveTopicId() {
    return store.getState().activeTopicId;
  }

  /**
   * Get categories for the active topic
   */
  getCategories() {
    const state = store.getState();
    const activeTopicId = state.activeTopicId;
    
    if (!activeTopicId) {
      return [];
    }
    
    return selectors.selectCategoriesByTopicId(state, activeTopicId) || [];
  }

  /**
   * Render categories to the UI
   */
  renderCategories() {
    const categoryList = document.getElementById('bookmark-categories');
    if (!categoryList) return;
    
    const categories = this.getCategories();
    const activeTopicId = this.getActiveTopicId();
    
    // If no active topic, clear categories and return
    if (!activeTopicId) {
      categoryList.innerHTML = '';
      return;
    }
    
    // Generate and set HTML
    categoryList.innerHTML = this.generateCategoriesHTML(categories);
    
    // Attach event listeners
    this.attachEventListeners(categories);
  }

  /**
   * Generate HTML for categories list
   */
  generateCategoriesHTML(categories) {
    if (!categories || categories.length === 0) {
      return "<li class='empty-list'>No categories yet. Add your first category!</li>";
    }

    return categories.map((category, index) => {
      return `
        <li class="category-item" 
            data-id="${category.id}" 
            data-index="${index}">
          <span class="category-text">${this.escapeHTML(category.name)}</span>
          <div class="category-actions">
            <button class="edit-btn" title="Edit Category">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" title="Delete Category">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </li>
      `;
    }).join('');
  }

  /**
   * Escape HTML special characters
   */
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Attach event listeners to category elements
   */
  attachEventListeners(categories) {
    const categoryItems = document.querySelectorAll('#bookmark-categories .category-item');
    
    categoryItems.forEach((item) => {
      const categoryId = item.dataset.id;
      const index = parseInt(item.dataset.index, 10);
      
      // Click on category to select
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-btn') && !e.target.closest('.delete-btn')) {
          this.handleCategorySelect(categories[index]);
        }
      });

      // Edit button
      const editBtn = item.querySelector('.edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleCategoryEdit(categoryId, categories[index].name);
        });
      }

      // Delete button
      const deleteBtn = item.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleCategoryDelete(categoryId);
        });
      }
    });
  }

  /**
   * Handle category selection
   */
  handleCategorySelect(category) {
    try {
      // Update selected category in UI state
      store.dispatch(actions.updateUiState({ 
        selectedCategoryId: category.id 
      }));
      
      // Notify callback if provided
      if (this.callbacks.onCategorySelect) {
        this.callbacks.onCategorySelect(category);
      }
    } catch (error) {
      console.error('Error selecting category:', error);
      showNotification('Error selecting category', 'error');
    }
  }

  /**
   * Handle category editing
   */
  handleCategoryEdit(categoryId, currentName) {
    const form = document.getElementById('edit-category-form');
    const input = document.getElementById('edit-category-input');
    const idInput = document.getElementById('edit-category-id');
    
    if (form && input && idInput) {
      form.style.display = 'block';
      input.value = currentName;
      idInput.value = categoryId;
      input.focus();
    }
  }

  /**
   * Save edited category
   */
  async saveEditedCategory(categoryId, newName) {
    try {
      if (!newName.trim()) {
        throw new Error('Category name cannot be empty');
      }
      
      const activeTopicId = this.getActiveTopicId();
      if (!activeTopicId) {
        throw new Error('No active topic');
      }
      
      // Update category in state
      await this.categoryService.updateCategory(activeTopicId, categoryId, { 
        name: newName.trim() 
      });
      
      // Hide edit form
      const form = document.getElementById('edit-category-form');
      if (form) {
        form.style.display = 'none';
      }
      
      // Show success notification
      showNotification('Category updated', 'success');
      
      // Notify callback if provided
      if (this.callbacks.onCategoryEdit) {
        const state = store.getState();
        const category = selectors.selectCategoryById(state, activeTopicId, categoryId);
        this.callbacks.onCategoryEdit(category);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      showNotification('Error updating category: ' + error.message, 'error');
    }
  }

  /**
   * Handle category deletion
   */
  async handleCategoryDelete(categoryId) {
    try {
      const activeTopicId = this.getActiveTopicId();
      if (!activeTopicId) {
        throw new Error('No active topic');
      }
      
      // Confirm deletion
      if (!confirm("Delete this category and its bookmarks?")) {
        return;
      }
      
      // Delete category in state
      await this.categoryService.deleteCategory(activeTopicId, categoryId);
      
      // If this was the selected category, clear selection
      const state = store.getState();
      if (state.uiState.selectedCategoryId === categoryId) {
        store.dispatch(actions.updateUiState({ 
          selectedCategoryId: null 
        }));
      }
      
      // Show success notification
      showNotification('Category deleted', 'success');
      
      // Notify callback if provided
      if (this.callbacks.onCategoryDelete) {
        this.callbacks.onCategoryDelete(categoryId);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification('Error deleting category: ' + error.message, 'error');
    }
  }

  /**
   * Setup event listeners for category forms
   */
  setupCategoryFormListeners() {
    const addCategoryBtn = document.getElementById('add-category-btn');
    const addCategoryForm = document.getElementById('add-category-form');
    const newCategoryInput = document.getElementById('new-category-input');
    const saveCategoryBtn = document.getElementById('save-category-btn');
    const cancelCategoryBtn = document.getElementById('cancel-category-btn');
    
    if (addCategoryBtn && addCategoryForm) {
      addCategoryBtn.addEventListener('click', () => {
        addCategoryForm.style.display = 'block';
        if (newCategoryInput) {
          newCategoryInput.focus();
        }
      });
    }

    if (saveCategoryBtn && newCategoryInput) {
      saveCategoryBtn.addEventListener('click', () => {
        this.createCategory(newCategoryInput.value);
      });
    }

    if (newCategoryInput) {
      newCategoryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.createCategory(newCategoryInput.value);
        }
      });
    }

    if (cancelCategoryBtn && addCategoryForm) {
      cancelCategoryBtn.addEventListener('click', () => {
        addCategoryForm.style.display = 'none';
        if (newCategoryInput) {
          newCategoryInput.value = '';
        }
      });
    }

    // Save edited category
    const saveEditCategoryBtn = document.getElementById('save-edit-category-btn');
    const editCategoryInput = document.getElementById('edit-category-input');
    const editCategoryId = document.getElementById('edit-category-id');
    
    if (saveEditCategoryBtn && editCategoryInput && editCategoryId) {
      saveEditCategoryBtn.addEventListener('click', () => {
        const categoryId = editCategoryId.value;
        const newName = editCategoryInput.value.trim();
        
        if (categoryId && newName) {
          this.saveEditedCategory(categoryId, newName);
        }
      });
    }

    // Cancel edit category
    const cancelEditCategoryBtn = document.getElementById('cancel-edit-category-btn');
    const editCategoryForm = document.getElementById('edit-category-form');
    
    if (cancelEditCategoryBtn && editCategoryForm) {
      cancelEditCategoryBtn.addEventListener('click', () => {
        editCategoryForm.style.display = 'none';
      });
    }
  }

  /**
   * Create a new category
   */
  async createCategory(name) {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('Category name cannot be empty');
      }
      
      const activeTopicId = this.getActiveTopicId();
      if (!activeTopicId) {
        throw new Error('No active topic');
      }
      
      // Create category in state
      await this.categoryService.createCategory(trimmedName, activeTopicId);
      
      // Hide add form and clear input
      const addCategoryForm = document.getElementById('add-category-form');
      const newCategoryInput = document.getElementById('new-category-input');
      
      if (addCategoryForm) {
        addCategoryForm.style.display = 'none';
      }
      
      if (newCategoryInput) {
        newCategoryInput.value = '';
      }
      
      // Show success notification
      showNotification('Category created', 'success');
    } catch (error) {
      console.error('Error creating category:', error);
      showNotification('Error creating category: ' + error.message, 'error');
    }
  }
}
