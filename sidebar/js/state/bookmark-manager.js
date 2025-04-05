/**
 * State-Integrated Bookmark Manager
 * 
 * This version of the bookmark manager uses the centralized state management system
 * instead of directly manipulating the storage.
 */

import { 
  store,
  actions,
  selectors,
  BookmarkService,
  showNotification
} from '../../../index.js';

export class StateBookmarkManager {
  constructor(elements) {
    this.elements = elements;
    this.bookmarkService = new BookmarkService();
    this.callbacks = {
      onBookmarkSelect: null,
      onBookmarkEdit: null,
      onBookmarkDelete: null
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
    // Only re-render if selected category or bookmarks changed
    this.renderBookmarks();
  }

  /**
   * Set callbacks for handling user interactions
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get selected category ID
   */
  getSelectedCategoryId() {
    return store.getState().uiState.selectedCategoryId;
  }

  /**
   * Get selected category
   */
  getSelectedCategory() {
    const state = store.getState();
    const activeTopicId = state.activeTopicId;
    const selectedCategoryId = state.uiState.selectedCategoryId;
    
    if (!activeTopicId || !selectedCategoryId) {
      return null;
    }
    
    return selectors.selectCategoryById(state, activeTopicId, selectedCategoryId);
  }

  /**
   * Get bookmarks for the selected category
   */
  getBookmarks() {
    const state = store.getState();
    const selectedCategoryId = state.uiState.selectedCategoryId;
    
    if (!selectedCategoryId) {
      return [];
    }
    
    return selectors.selectBookmarksByCategoryId(state, selectedCategoryId) || [];
  }

  /**
   * Render bookmarks for the selected category
   */
  renderBookmarks() {
    const bookmarksList = document.getElementById('bookmark-links');
    const bookmarksSection = document.getElementById('bookmark-links-section');
    const selectedCategoryName = document.getElementById('selected-category-name');
    
    if (!bookmarksList || !bookmarksSection || !selectedCategoryName) {
      return;
    }
    
    const selectedCategory = this.getSelectedCategory();
    
    // If no selected category, hide bookmarks section and return
    if (!selectedCategory) {
      bookmarksSection.style.display = 'none';
      bookmarksList.innerHTML = '';
      selectedCategoryName.textContent = '';
      return;
    }
    
    // Show bookmarks section and update category name
    bookmarksSection.style.display = 'block';
    selectedCategoryName.textContent = selectedCategory.name;
    
    // Get bookmarks for the selected category
    const bookmarks = this.getBookmarks();
    
    // Generate and set HTML
    bookmarksList.innerHTML = this.generateBookmarksHTML(bookmarks);
    
    // Attach event listeners
    this.attachEventListeners(bookmarks);
  }

  /**
   * Generate HTML for bookmarks list
   */
  generateBookmarksHTML(bookmarks) {
    if (!bookmarks || bookmarks.length === 0) {
      return "<li class='empty-list'>No bookmarks yet. Add your first bookmark!</li>";
    }

    return bookmarks.map((bookmark, index) => {
      const faviconUrl = bookmark.favicon || this.getFaviconUrl(bookmark.url);
      
      return `
        <li class="bookmark-item" 
            data-id="${bookmark.id}" 
            data-index="${index}">
          <div class="bookmark-info">
            <img src="${faviconUrl}" class="favicon" onerror="this.src='${this.getDefaultFavicon()}'">
            <a href="${this.escapeHTML(bookmark.url)}" target="_blank" class="bookmark-link">
              ${this.escapeHTML(bookmark.title)}
            </a>
          </div>
          <div class="bookmark-actions">
            <button class="edit-btn" title="Edit Bookmark">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" title="Delete Bookmark">
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
   * Get favicon URL for a website
   */
  getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}`;
    } catch (e) {
      return this.getDefaultFavicon();
    }
  }

  /**
   * Get default favicon
   */
  getDefaultFavicon() {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2NjYyIgZD0iTTEyIDJjNS41MiAwIDEwIDQuNDggMTAgMTBzLTQuNDggMTAtMTAgMTAtMTAtNC40OC0xMC0xMCA0LjQ4LTEwIDEwLTEwem0wIDE4YzQuNDIgMCA4LTMuNTggOC04cy0zLjU4LTgtOC04LTggMy41OC04IDggMy41OCA4IDggOHptMC0xNGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6bTAgMTBjMi4yMSAwIDQtMS43OSA0LTRzLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wLTZjMS4xIDAgMiAuOSAyIDJzLS45IDItMiAyLTItLjktMi0yIC45LTIgMi0yeiIvPjwvc3ZnPg==';
  }

  /**
   * Attach event listeners to bookmark elements
   */
  attachEventListeners(bookmarks) {
    const bookmarkItems = document.querySelectorAll('#bookmark-links .bookmark-item');
    
    bookmarkItems.forEach((item) => {
      const bookmarkId = item.dataset.id;
      const index = parseInt(item.dataset.index, 10);
      
      // Edit button
      const editBtn = item.querySelector('.edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.handleBookmarkEdit(bookmarkId, bookmarks[index]);
        });
      }

      // Delete button
      const deleteBtn = item.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.handleBookmarkDelete(bookmarkId);
        });
      }
    });
  }

  /**
   * Handle bookmark editing
   */
  handleBookmarkEdit(bookmarkId, bookmark) {
    const form = document.getElementById('edit-link-form');
    const titleInput = document.getElementById('edit-link-title-input');
    const urlInput = document.getElementById('edit-link-url-input');
    const idInput = document.getElementById('edit-link-id');
    
    if (form && titleInput && urlInput && idInput) {
      form.style.display = 'block';
      titleInput.value = bookmark.title;
      urlInput.value = bookmark.url;
      idInput.value = bookmarkId;
      titleInput.focus();
      
      // Notify callback if provided
      if (this.callbacks.onBookmarkEdit) {
        this.callbacks.onBookmarkEdit(bookmark);
      }
    }
  }

  /**
   * Save edited bookmark
   */
  async saveEditedBookmark(bookmarkId, updates) {
    try {
      if (!updates.title.trim() || !updates.url.trim()) {
        throw new Error('Bookmark title and URL cannot be empty');
      }
      
      const categoryId = this.getSelectedCategoryId();
      if (!categoryId) {
        throw new Error('No category selected');
      }
      
      // Update bookmark in state
      await this.bookmarkService.updateBookmark(categoryId, bookmarkId, updates);
      
      // Hide edit form
      const form = document.getElementById('edit-link-form');
      if (form) {
        form.style.display = 'none';
      }
      
      // Show success notification
      showNotification('Bookmark updated', 'success');
    } catch (error) {
      console.error('Error updating bookmark:', error);
      showNotification('Error updating bookmark: ' + error.message, 'error');
    }
  }

  /**
   * Handle bookmark deletion
   */
  async handleBookmarkDelete(bookmarkId) {
    try {
      const categoryId = this.getSelectedCategoryId();
      if (!categoryId) {
        throw new Error('No category selected');
      }
      
      // Confirm deletion
      if (!confirm("Delete this bookmark?")) {
        return;
      }
      
      // Delete bookmark in state
      await this.bookmarkService.deleteBookmark(categoryId, bookmarkId);
      
      // Show success notification
      showNotification('Bookmark deleted', 'success');
      
      // Notify callback if provided
      if (this.callbacks.onBookmarkDelete) {
        this.callbacks.onBookmarkDelete(bookmarkId);
      }
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      showNotification('Error deleting bookmark: ' + error.message, 'error');
    }
  }

  /**
   * Setup event listeners for bookmark forms
   */
  setupBookmarkFormListeners() {
    // Add bookmark button
    const addLinkBtn = document.getElementById('add-link-btn');
    const addLinkForm = document.getElementById('add-link-form');
    
    if (addLinkBtn && addLinkForm) {
      addLinkBtn.addEventListener('click', () => {
        addLinkForm.style.display = 'block';
        const titleInput = document.getElementById('new-link-title-input');
        if (titleInput) {
          titleInput.focus();
        }
      });
    }

    // Use current tab button (add form)
    const useCurrentUrlBtn = document.getElementById('use-current-url-btn');
    const newLinkTitleInput = document.getElementById('new-link-title-input');
    const newLinkUrlInput = document.getElementById('new-link-url-input');
    
    if (useCurrentUrlBtn && newLinkTitleInput && newLinkUrlInput) {
      useCurrentUrlBtn.addEventListener('click', async () => {
        try {
          const bookmarks = await this.bookmarkService.createBookmarkFromCurrentTab(this.getSelectedCategoryId());
          
          if (bookmarks && bookmarks.length > 0) {
            const bookmark = bookmarks[0];
            newLinkTitleInput.value = bookmark.title;
            newLinkUrlInput.value = bookmark.url;
          } else {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs.length > 0) {
              newLinkTitleInput.value = tabs[0].title || '';
              newLinkUrlInput.value = tabs[0].url || '';
            }
          }
        } catch (error) {
          console.error('Error getting current tab:', error);
          showNotification('Error getting current tab', 'error');
        }
      });
    }

    // Save bookmark button
    const saveLinkBtn = document.getElementById('save-link-btn');
    
    if (saveLinkBtn && newLinkTitleInput && newLinkUrlInput) {
      saveLinkBtn.addEventListener('click', () => {
        this.createBookmark(newLinkTitleInput.value, newLinkUrlInput.value);
      });
    }

    // Cancel add bookmark
    const cancelLinkBtn = document.getElementById('cancel-link-btn');
    
    if (cancelLinkBtn && addLinkForm) {
      cancelLinkBtn.addEventListener('click', () => {
        addLinkForm.style.display = 'none';
        if (newLinkTitleInput && newLinkUrlInput) {
          newLinkTitleInput.value = '';
          newLinkUrlInput.value = '';
        }
      });
    }

    // Use current tab button (edit form)
    const useCurrentUrlEditBtn = document.getElementById('use-current-url-edit-btn');
    const editLinkTitleInput = document.getElementById('edit-link-title-input');
    const editLinkUrlInput = document.getElementById('edit-link-url-input');
    
    if (useCurrentUrlEditBtn && editLinkTitleInput && editLinkUrlInput) {
      useCurrentUrlEditBtn.addEventListener('click', async () => {
        try {
          const tabs = await browser.tabs.query({ active: true, currentWindow: true });
          if (tabs && tabs.length > 0) {
            editLinkTitleInput.value = tabs[0].title || '';
            editLinkUrlInput.value = tabs[0].url || '';
          }
        } catch (error) {
          console.error('Error getting current tab:', error);
          showNotification('Error getting current tab', 'error');
        }
      });
    }

    // Save edited bookmark
    const saveEditLinkBtn = document.getElementById('save-edit-link-btn');
    const editLinkId = document.getElementById('edit-link-id');
    
    if (saveEditLinkBtn && editLinkTitleInput && editLinkUrlInput && editLinkId) {
      saveEditLinkBtn.addEventListener('click', () => {
        const bookmarkId = editLinkId.value;
        const updates = {
          title: editLinkTitleInput.value.trim(),
          url: editLinkUrlInput.value.trim()
        };
        
        if (bookmarkId && updates.title && updates.url) {
          this.saveEditedBookmark(bookmarkId, updates);
        }
      });
    }

    // Cancel edit bookmark
    const cancelEditLinkBtn = document.getElementById('cancel-edit-link-btn');
    const editLinkForm = document.getElementById('edit-link-form');
    
    if (cancelEditLinkBtn && editLinkForm) {
      cancelEditLinkBtn.addEventListener('click', () => {
        editLinkForm.style.display = 'none';
      });
    }
  }

  /**
   * Create a new bookmark
   */
  async createBookmark(title, url) {
    try {
      const trimmedTitle = title.trim();
      const trimmedUrl = url.trim();
      
      if (!trimmedTitle || !trimmedUrl) {
        throw new Error('Bookmark title and URL cannot be empty');
      }
      
      const categoryId = this.getSelectedCategoryId();
      if (!categoryId) {
        throw new Error('No category selected');
      }
      
      // Create bookmark in state
      await this.bookmarkService.createBookmark(trimmedTitle, trimmedUrl, categoryId);
      
      // Hide add form and clear inputs
      const addLinkForm = document.getElementById('add-link-form');
      const newLinkTitleInput = document.getElementById('new-link-title-input');
      const newLinkUrlInput = document.getElementById('new-link-url-input');
      
      if (addLinkForm) {
        addLinkForm.style.display = 'none';
      }
      
      if (newLinkTitleInput && newLinkUrlInput) {
        newLinkTitleInput.value = '';
        newLinkUrlInput.value = '';
      }
      
      // Show success notification
      showNotification('Bookmark created', 'success');
    } catch (error) {
      console.error('Error creating bookmark:', error);
      showNotification('Error creating bookmark: ' + error.message, 'error');
    }
  }
}
