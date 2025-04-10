/**
 * Category Sets Modal
 * 
 * Provides UI for managing category sets that can be applied to topics.
 */
import { 
  CategoryService,
  escapeHtml,
  MessageTypes,
  sendMessage
} from '../../index.js';

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const setsContainer = document.querySelector('.sets-container');
  const addSetBtn = document.getElementById('add-set-btn');
  const addSetForm = document.getElementById('add-set-form');
  const newSetInput = document.getElementById('new-set-input');
  const saveNewSetBtn = document.getElementById('save-new-set-btn');
  const cancelNewSetBtn = document.getElementById('cancel-new-set-btn');
  const closeBtn = document.getElementById('close-btn');

  // Initialize services
  const categoryService = new CategoryService();
  let categorySets = {};

  /**
   * Load category sets from storage
   */
  async function loadCategorySets() {
    try {
      categorySets = await categoryService.getCategorySets();
      
      // Add a default category set if none exist
      if (Object.keys(categorySets).length === 0) {
        const defaultSet = {
          id: 'default',
          name: 'Default Set',
          categories: ['General', 'Work', 'Personal'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        categorySets = { default: defaultSet };
        await saveCategorySets();
      }
      
      renderSets();
    } catch (err) {
      console.error('Error loading category sets:', err);
    }
  }

  /**
   * Save changes to category sets
   */
  async function saveCategorySets() {
    try {
      await categoryService.updateCategorySets(categorySets);
      
      // Notify other components about the update
      await sendMessage(MessageTypes.CATEGORY_SET_UPDATE, {
        categorySets
      });
    } catch (err) {
      console.error('Error saving category sets:', err);
    }
  }

  /**
   * Render all category sets to the UI
   */
  function renderSets() {
    setsContainer.innerHTML = Object.entries(categorySets)
      .map(([id, set]) => `
        <div class="set-item" data-id="${id}">
          <div class="set-header">
            <span class="set-title">${escapeHtml(set.name)}</span>
            <div class="set-actions">
              <button class="secondary-btn add-category-btn">
                <i class="fas fa-plus"></i> Add Category
              </button>
              <button class="secondary-btn edit-set-btn">
                <i class="fas fa-edit"></i> Rename
              </button>
              <button class="danger-btn delete-set-btn">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
          </div>
          
          <ul class="categories-list">
            ${set.categories.map((category, index) => `
              <li class="category-item" data-index="${index}">
                <span class="category-text">${escapeHtml(category)}</span>
                <div class="category-actions">
                  <button class="icon-btn edit-category-btn" title="Edit Category">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="icon-btn delete-category-btn" title="Delete Category">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </li>
            `).join('')}
          </ul>

          <div class="edit-form hidden" id="add-category-form-${id}">
            <input type="text" class="new-category-input" placeholder="New category name...">
            <button class="secondary-btn save-category-btn">Add</button>
            <button class="danger-btn cancel-category-btn">Cancel</button>
          </div>
        </div>
      `).join('');

    attachSetEventListeners();
  }

  /**
   * Attach event listeners to set items
   */
  function attachSetEventListeners() {
    // Add category button
    document.querySelectorAll('.add-category-btn').forEach(btn => {
      const setItem = btn.closest('.set-item');
      const setId = setItem.dataset.id;
      const form = setItem.querySelector('.edit-form');
      
      btn.addEventListener('click', () => {
        form.classList.remove('hidden');
        form.querySelector('input').focus();
      });
    });

    // Save new category
    document.querySelectorAll('.save-category-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const setItem = btn.closest('.set-item');
        const setId = setItem.dataset.id;
        const input = setItem.querySelector('.new-category-input');
        const category = input.value.trim();

        if (category) {
          categorySets[setId].categories.push(category);
          await saveCategorySets();
          renderSets();
        }
      });
    });

    // Cancel adding category
    document.querySelectorAll('.cancel-category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const form = btn.closest('.edit-form');
        form.classList.add('hidden');
        form.querySelector('input').value = '';
      });
    });

    // Edit category
    document.querySelectorAll('.edit-category-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const categoryItem = btn.closest('.category-item');
        const setItem = categoryItem.closest('.set-item');
        const setId = setItem.dataset.id;
        const categoryIndex = parseInt(categoryItem.dataset.index);
        const currentName = categorySets[setId].categories[categoryIndex];
        
        const newName = prompt('Edit category name:', currentName);
        if (newName && newName !== currentName) {
          categorySets[setId].categories[categoryIndex] = newName;
          await saveCategorySets();
          renderSets();
        }
      });
    });

    // Delete category
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this category?')) {
          const categoryItem = btn.closest('.category-item');
          const setItem = categoryItem.closest('.set-item');
          const setId = setItem.dataset.id;
          const categoryIndex = parseInt(categoryItem.dataset.index);
          
          categorySets[setId].categories.splice(categoryIndex, 1);
          await saveCategorySets();
          renderSets();
        }
      });
    });

    // Edit set name
    document.querySelectorAll('.edit-set-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const setItem = btn.closest('.set-item');
        const setId = setItem.dataset.id;
        const currentName = categorySets[setId].name;
        
        const newName = prompt('Edit set name:', currentName);
        if (newName && newName !== currentName) {
          categorySets[setId].name = newName;
          await saveCategorySets();
          renderSets();
        }
      });
    });

    // Delete set
    document.querySelectorAll('.delete-set-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const setItem = btn.closest('.set-item');
        const setId = setItem.dataset.id;
        
        if (Object.keys(categorySets).length <= 1) {
          alert("Can't delete the last category set");
          return;
        }
        
        if (confirm('Delete this category set?')) {
          delete categorySets[setId];
          await saveCategorySets();
          renderSets();
        }
      });
    });
  }

  // Add new set button
  addSetBtn.addEventListener('click', () => {
    addSetForm.classList.remove('hidden');
    newSetInput.focus();
  });

  // Save new set
  saveNewSetBtn.addEventListener('click', async () => {
    const name = newSetInput.value.trim();
    if (name) {
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      categorySets[id] = {
        name,
        categories: []
      };
      await saveCategorySets();
      renderSets();
      addSetForm.classList.add('hidden');
      newSetInput.value = '';
    }
  });

  // Cancel new set
  cancelNewSetBtn.addEventListener('click', () => {
    addSetForm.classList.add('hidden');
    newSetInput.value = '';
  });

  // Close button
  closeBtn.addEventListener('click', () => {
    window.close();
  });

  // Load initial data
  await loadCategorySets();
});
