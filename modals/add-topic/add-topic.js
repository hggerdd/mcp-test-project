/**
 * Add Topic Modal
 * 
 * Provides UI for creating a new topic and choosing category sets.
 */
import { 
  CategoryService,
  MessageTypes,
  sendMessage
} from '../../index.js';

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const input = document.getElementById('topic-input');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const addStandardCategoriesCheckbox = document.getElementById('add-standard-categories');
  const categorySetSelect = document.getElementById('category-set-select');
  const manageSetBtn = document.getElementById('manage-sets-btn');

  // Initialize services
  const categoryService = new CategoryService();
  let categorySets = {};

  /**
   * Load category sets from storage
   */
  async function loadCategorySets() {
    try {
      categorySets = await categoryService.getCategorySets();
      updateCategorySetSelect();
    } catch (err) {
      console.error('Error loading category sets:', err);
    }
  }

  /**
   * Update category set dropdown options
   */
  function updateCategorySetSelect() {
    categorySetSelect.innerHTML = Object.entries(categorySets)
      .map(([id, set]) => `<option value="${id}">${set.name} (${set.categories.join(', ')})</option>`)
      .join('');
  }

  /**
   * Toggle category set select visibility based on checkbox
   */
  addStandardCategoriesCheckbox.addEventListener('change', (e) => {
    categorySetSelect.style.display = e.target.checked ? 'block' : 'none';
  });

  /**
   * Open category sets management modal
   */
  manageSetBtn.addEventListener('click', async () => {
    const modalUrl = browser.runtime.getURL('modals/category-sets/category-sets-modal.html');
    
    try {
      const modal = await browser.windows.create({
        url: modalUrl,
        type: 'popup',
        width: 500,
        height: 600,
        allowScriptsToClose: true,
        left: screen.width / 2 - 250,
        top: screen.height / 2 - 300
      });
    } catch (error) {
      console.error('Error opening category sets modal:', error);
    }
  });

  /**
   * Listen for category set updates from other components
   */
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === MessageTypes.CATEGORY_SET_UPDATE) {
      categorySets = message.categorySets;
      updateCategorySetSelect();
    }
  });

  /**
   * Send response back to the caller
   */
  async function respond(success, topicName = '', categorySet = null) {
    try {
      if (!success) {
        window.close();
        return;
      }

      // Get selected category set if checkbox is checked
      if (addStandardCategoriesCheckbox.checked) {
        const selectedSetId = categorySetSelect.value;
        if (selectedSetId && categorySets[selectedSetId]) {
          categorySet = {
            list_of_categories: [...categorySets[selectedSetId].categories]
          };
        }
      }

      // Send response message
      await sendMessage(MessageTypes.ADD_TOPIC_RESPONSE, {
        success: true,
        topicName,
        categorySet
      });
      
      window.close();
    } catch (err) {
      console.error('Error sending response:', err);
      alert('Failed to create topic. Please try again.');
    }
  }

  /**
   * Save button handler
   */
  saveBtn.addEventListener('click', () => {
    const name = input.value.trim();
    if (name) {
      respond(true, name);
    }
  });

  /**
   * Cancel button handler
   */
  cancelBtn.addEventListener('click', () => {
    respond(false);
  });

  /**
   * Handle keyboard events
   */
  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      const name = input.value.trim();
      if (name) {
        respond(true, name);
      }
    } else if (e.key === 'Escape') {
      respond(false);
    }
  });

  // Focus input on load
  input.focus();
  
  // Load category sets on startup
  await loadCategorySets();
});
