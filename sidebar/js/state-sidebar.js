/**
 * State-Integrated Sidebar
 * 
 * This is the main entry point for the sidebar, using the new state management system.
 * It integrates all the state-based managers and handles their coordination.
 */

import { 
  store, 
  actions, 
  initializeStore,
  showNotification
} from '../../index.js';

import { StateTopicManager } from './state/topic-manager.js';
import { StateCategoryManager } from './state/category-manager.js';
import { StateBookmarkManager } from './state/bookmark-manager.js';
import { StateTabManager } from './state/tab-manager.js';

let topicManager, categoryManager, bookmarkManager, tabManager;

document.addEventListener("DOMContentLoaded", async function() {
  try {
    // Initialize store
    await initializeStore();
    
    // Get UI elements
    const elements = getElements();
    
    // Initialize managers
    await initializeManagers(elements);
    
    // Setup coordination between managers
    setupCoordination();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Sidebar initialized with state management');
  } catch (error) {
    console.error('Initialization error:', error);
    showNotification('Failed to initialize sidebar', 'error');
  }
});

/**
 * Get all required DOM elements
 */
function getElements() {
  return {
    // Topic elements
    addTopicBtn: document.getElementById("add-topic-btn"),
    topicsList: document.getElementById("topics-list"),
    editTopicForm: document.getElementById("edit-topic-form"),
    editTopicInput: document.getElementById("edit-topic-input"),
    editTopicId: document.getElementById("edit-topic-id"),
    saveEditTopicBtn: document.getElementById("save-edit-topic-btn"),
    cancelEditTopicBtn: document.getElementById("cancel-edit-topic-btn"),
    
    // Category elements
    bookmarkCategories: document.getElementById("bookmark-categories"),
    addCategoryBtn: document.getElementById("add-category-btn"),
    addCategoryForm: document.getElementById("add-category-form"),
    newCategoryInput: document.getElementById("new-category-input"),
    saveCategoryBtn: document.getElementById("save-category-btn"),
    cancelCategoryBtn: document.getElementById("cancel-category-btn"),
    editCategoryForm: document.getElementById("edit-category-form"),
    editCategoryInput: document.getElementById("edit-category-input"),
    editCategoryId: document.getElementById("edit-category-id"),
    saveEditCategoryBtn: document.getElementById("save-edit-category-btn"),
    cancelEditCategoryBtn: document.getElementById("cancel-edit-category-btn"),
    
    // Bookmark elements
    bookmarkLinksSection: document.getElementById("bookmark-links-section"),
    selectedCategoryName: document.getElementById("selected-category-name"),
    bookmarkLinks: document.getElementById("bookmark-links"),
    addLinkBtn: document.getElementById("add-link-btn"),
    addLinkForm: document.getElementById("add-link-form"),
    newLinkTitleInput: document.getElementById("new-link-title-input"),
    newLinkUrlInput: document.getElementById("new-link-url-input"),
    useCurrentUrlBtn: document.getElementById("use-current-url-btn"),
    saveLinkBtn: document.getElementById("save-link-btn"),
    cancelLinkBtn: document.getElementById("cancel-link-btn"),
    editLinkForm: document.getElementById("edit-link-form"),
    editLinkTitleInput: document.getElementById("edit-link-title-input"),
    editLinkUrlInput: document.getElementById("edit-link-url-input"),
    useCurrentUrlEditBtn: document.getElementById("use-current-url-edit-btn"),
    saveEditLinkBtn: document.getElementById("save-edit-link-btn"),
    cancelEditLinkBtn: document.getElementById("cancel-edit-link-btn"),
    editLinkId: document.getElementById("edit-link-id"),
    
    // Data management elements
    saveDataBtn: document.getElementById("save-data-btn"),
    loadDataBtn: document.getElementById("load-data-btn")
  };
}

/**
 * Initialize all managers
 */
async function initializeManagers(elements) {
  // Create managers
  topicManager = new StateTopicManager(elements);
  categoryManager = new StateCategoryManager(elements);
  bookmarkManager = new StateBookmarkManager(elements);
  tabManager = new StateTabManager();
  
  // Setup callbacks
  topicManager.setCallbacks({
    onTopicSelect: handleTopicSelect,
    onTopicEdit: handleTopicEdit,
    onTopicDelete: handleTopicDelete,
    onTopicReorder: handleTopicReorder
  });
  
  categoryManager.setCallbacks({
    onCategorySelect: handleCategorySelect,
    onCategoryEdit: handleCategoryEdit,
    onCategoryDelete: handleCategoryDelete
  });
  
  bookmarkManager.setCallbacks({
    onBookmarkEdit: handleBookmarkEdit,
    onBookmarkDelete: handleBookmarkDelete
  });
  
  // Setup form listeners
  topicManager.setupTopicFormListeners();
  categoryManager.setupCategoryFormListeners();
  bookmarkManager.setupBookmarkFormListeners();
  
  // Initialize tab manager
  await tabManager.initialize();
}

/**
 * Setup coordination between managers
 */
function setupCoordination() {
  // Handle initial render
  topicManager.renderTopics();
  categoryManager.renderCategories();
  bookmarkManager.renderBookmarks();
}

/**
 * Setup additional event listeners
 */
function setupEventListeners() {
  // Setup data export/import
  const saveDataBtn = document.getElementById('save-data-btn');
  const loadDataBtn = document.getElementById('load-data-btn');
  
  if (saveDataBtn) {
    saveDataBtn.addEventListener('click', handleExportData);
  }
  
  if (loadDataBtn) {
    loadDataBtn.addEventListener('click', handleImportData);
  }
  
  // Subscribe to store changes to update tab manager state
  store.subscribe(handleStateChange);
}

/**
 * Handle state changes
 */
function handleStateChange(state) {
  // State changes are handled by the respective managers
}

/**
 * Handle topic selection
 */
async function handleTopicSelect(topic) {
  console.log('Topic selected:', topic);
  
  try {
    // The topic selection will be handled by the StateTabManager
    // through its store subscription for activeTopicId changes
    await tabManager.validateTabAssignments();
  } catch (error) {
    console.error('Error in topic selection:', error);
    showNotification('Error selecting topic', 'error');
  }
}

/**
 * Handle topic editing
 */
function handleTopicEdit(topic) {
  console.log('Topic edited:', topic);
  // UI will update automatically through state subscription
}

/**
 * Handle topic deletion
 */
async function handleTopicDelete(topicId) {
  console.log('Topic deleted:', topicId);
  
  try {
    // Close all tabs for the deleted topic
    await tabManager.closeTabsForTopic(topicId);
  } catch (error) {
    console.error('Error closing tabs for topic:', error);
    showNotification('Error closing tabs for deleted topic', 'error');
  }
  
  // UI will update automatically through state subscription
}

/**
 * Handle topic reordering
 */
function handleTopicReorder(fromIndex, toIndex) {
  console.log('Topic reordered:', fromIndex, 'to', toIndex);
  // UI will update automatically through state subscription
}

// Handler functions for category actions
function handleCategorySelect(category) {
  console.log('Category selected:', category);
  // Bookmark manager will respond to state change
}

function handleCategoryEdit(category) {
  console.log('Category edited:', category);
  // UI will update automatically through state subscription
}

function handleCategoryDelete(categoryId) {
  console.log('Category deleted:', categoryId);
  // UI will update automatically through state subscription
}

// Handler functions for bookmark actions
function handleBookmarkEdit(bookmark) {
  console.log('Bookmark edit started:', bookmark);
  // Edit form is shown by the bookmark manager
}

function handleBookmarkDelete(bookmarkId) {
  console.log('Bookmark deleted:', bookmarkId);
  // UI will update automatically through state subscription
}

// Handler functions for data management
async function handleExportData() {
  try {
    // Get all state
    const state = store.getState();
    
    // Create export data
    const exportData = {
      version: 1,
      timestamp: Date.now(),
      data: {
        topics: state.topics,
        activeTopicId: state.activeTopicId,
        categories: state.categories,
        bookmarks: state.bookmarks,
        categorySets: state.categorySets
      }
    };
    
    // Convert to JSON
    const jsonData = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `simple-topics-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
    showNotification('Data exported successfully', 'success');
  } catch (error) {
    console.error('Error exporting data:', error);
    showNotification('Failed to export data', 'error');
  }
}

async function handleImportData() {
  try {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    // Handle file selection
    input.onchange = async (event) => {
      try {
        const file = event.target.files[0];
        if (!file) return;
        
        // Read file
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const content = e.target.result;
            const importData = JSON.parse(content);

            console.log('Import data:', importData);
            
            // Validate import data
            if (!importData || !importData.data || !importData.version) {
              throw new Error('Invalid import data format');
            }
            
            // Confirm import
            if (!confirm('Import data? This will replace all your current data.')) {
              return;
            }
            
            // Reset state
            store.dispatch(actions.resetState());
            
            // Import topics
            if (importData.data.topics) {
              store.dispatch(actions.setTopics({ topics: importData.data.topics }));
            }
            
            // Import category sets
            if (importData.data.categorySets) {
              store.dispatch(actions.setCategorySets({ categorySets: importData.data.categorySets }));
            }
            
            // Import categories
            if (importData.data.categories) {
              for (const [topicId, categories] of Object.entries(importData.data.categories)) {
                store.dispatch(actions.setCategories({ topicId, categories }));
              }
            }
            
            // Import bookmarks
            if (importData.data.bookmarks) {
              for (const [categoryId, bookmarks] of Object.entries(importData.data.bookmarks)) {
                store.dispatch(actions.setBookmarks({ categoryId, bookmarks }));
              }
            }
            
            // Finally, set active topic (which will trigger tab changes)
            if (importData.data.activeTopicId) {
              store.dispatch(actions.setActiveTopic({ topicId: importData.data.activeTopicId }));
            }
            
            // Reinitialize tab manager to properly handle the new state
            await tabManager.initialize();
            
            showNotification('Data imported successfully', 'success');
          } catch (error) {
            console.error('Error parsing import data:', error);
            showNotification('Failed to parse import data', 'error');
          }
        };
        
        reader.readAsText(file);
      } catch (error) {
        console.error('Error reading import file:', error);
        showNotification('Failed to read import file', 'error');
      }
    };
    
    // Trigger file selection
    input.click();
  } catch (error) {
    console.error('Error importing data:', error);
    showNotification('Failed to import data', 'error');
  }
}
