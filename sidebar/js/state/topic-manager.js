/**
 * State-Integrated Topic Manager
 * 
 * This version of the topic manager uses the centralized state management system
 * instead of directly manipulating the storage.
 */

import { 
  store, 
  actions, 
  selectors,
  TopicService,
  showNotification
} from '../../../index.js';
import { TabIdentifier } from '../../../utils/tab-identifier.js';

export class StateTopicManager {
  constructor(elements) {
    this.elements = elements;
    this.topicService = new TopicService();
    this.callbacks = {
      onTopicSelect: null,
      onTopicEdit: null,
      onTopicDelete: null,
      onTopicReorder: null
    };
    this.dragState = {
      draggedIndex: -1,
      dropTarget: null
    };
    this.tabCountMap = new Map(); // Map to store tab counts by topic ID
    this.tabIdentifier = new TabIdentifier(); // Use the same tab identifier as the tab manager

    // Set up store subscription
    this.unsubscribe = store.subscribe(this.handleStateChange.bind(this));

    // Set up message listener for modal responses
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'modalResponse') {
        this.handleModalResponse(message);
      }
    });
    
    // Set up tab event listeners to track tab counts
    this.setupTabEventListeners();
    
    // Set up runtime message listeners for tab changes
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'tabAssignmentsChanged' || 
          message.type === 'tabVisibilityChanged' ||
          message.type === 'tabAssigned' ||
          message.type === 'topicTabsClosed') {
        this.updateAllTabCounts();
      }
    });
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
    // Only re-render if topics or activeTopicId changed
    this.renderTopics();
  }

  /**
   * Set callbacks for handling user interactions
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get topics from state
   */
  getTopics() {
    return store.getState().topics;
  }

  /**
   * Get active topic ID
   */
  getActiveTopicId() {
    return store.getState().activeTopicId;
  }

  /**
   * Get active topic index
   */
  getActiveTopicIndex() {
    const topics = this.getTopics();
    const activeTopicId = this.getActiveTopicId();
    return topics.findIndex(topic => topic.id === activeTopicId);
  }

  /**
   * Render topics to the UI
   */
  renderTopics() {
    if (!this.elements.topicsList) return;
    
    const topics = this.getTopics();
    const activeTopicIndex = this.getActiveTopicIndex();
    
    this.elements.topicsList.innerHTML = this.generateTopicsHTML(topics, activeTopicIndex);
    this.attachEventListeners(topics);
    
    // Update tab counts after rendering
    this.updateAllTabCounts();
  }
  
  /**
   * Set up tab event listeners to keep track of tab counts
   */
  setupTabEventListeners() {
    // Update tab counts initially
    this.updateAllTabCounts();

    // Listen for tab creation - needs immediate update
    browser.tabs.onCreated.addListener(async (tab) => {
      await this.updateAllTabCounts();
    });

    // Listen for tab removal - needs immediate update
    browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
      await this.updateAllTabCounts();
    });

    // Listen for tab updates (URL changes)
    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.url) {
        await this.updateAllTabCounts();
      }
    });

    // Listen for tab visibility changes - only if the API is available
    try {
      if (browser.tabs.onShown && browser.tabs.onHidden) {
        browser.tabs.onShown.addListener(async (tabId, windowId) => {
          console.log("Tab shown, updating tab counts");
          await this.updateAllTabCounts();
        });

        browser.tabs.onHidden.addListener(async (tabId, windowId) => {
          console.log("Tab hidden, updating tab counts");
          await this.updateAllTabCounts();
        });
        console.log("Successfully added tab visibility event listeners");
      } else {
        console.log("Tab visibility events (onShown/onHidden) not available in this browser version");
      }
    } catch (err) {
      console.warn("Could not set up tab visibility listeners:", err.message);
    }

    // Also update counts when we get a message from background
    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type === 'tabsChanged' || message.type === 'topicChanged') {
        await this.updateAllTabCounts();
      }
    });
  }

  /**
   * Update tab counts for all topics
   */
  async updateAllTabCounts() {
    try {
      console.log("🔄 Updating tab counts...");
      
      // Try to get counts from tab manager first (most accurate)
      if (this.tabManager) {
        try {
          await this.updateTabCountsFromTabManager();
          console.log("✓ Used tab manager for counting");
          return true;
        } catch (err) {
          console.warn("Could not use tab manager for counting, falling back to storage-based counting", err);
        }
      }
      
      // Fallback: Count from storage and browser tabs
      
      // Get all tabs directly from browser API
      const allTabs = await browser.tabs.query({});
      
      // Get tab assignments from storage
      const tabAssignments = await browser.storage.local.get('tabAssignments');
      const stableIdToTopicMap = tabAssignments.tabAssignments || {};
      
      // Reset counts
      this.tabCountMap.clear();
      
      // Initialize counts for all topics to zero
      const topics = this.getTopics();
      topics.forEach(topic => {
        this.tabCountMap.set(topic.id, 0);
      });

      // Add an additional safety check - make sure all topics have an entry
      Object.values(stableIdToTopicMap).forEach(topicId => {
        if (!this.tabCountMap.has(topicId)) {
          this.tabCountMap.set(topicId, 0);
        }
      });

      // Track tabs by topic ID for more accurate counting
      const tabsByTopic = new Map();
      const processedStableIds = new Set(); // Track by stable ID instead of tab ID
      
      // First pass: catalog all tabs by their stable IDs
      const tabStableIds = new Map(); // Map tab IDs to stable IDs
      
      for (const tab of allTabs) {
        if (!this.isRegularTab(tab.url)) continue;
        
        try {
          const stableId = await this.getStableTabId(tab);
          tabStableIds.set(tab.id, stableId);
        } catch (err) {
          console.error(`Error getting stable ID for tab ${tab.id}:`, err);
        }
      }
      
      // Second pass: group tabs by topic and count them
      for (const tab of allTabs) {
        if (!this.isRegularTab(tab.url)) continue;
        
        try {
          const stableId = tabStableIds.get(tab.id);
          if (!stableId) continue;
          
          // Skip if we've already processed this stable ID
          if (processedStableIds.has(stableId)) continue;
          processedStableIds.add(stableId);
          
          // Get topic for this tab
          const topicId = stableIdToTopicMap[stableId];
          if (!topicId) continue;
          
          // Add to the topic's tab collection
          if (!tabsByTopic.has(topicId)) {
            tabsByTopic.set(topicId, new Set());
          }
          tabsByTopic.get(topicId).add(tab.id);
        } catch (err) {
          console.error(`Error processing tab ${tab.id}:`, err);
        }
      }
      
      // Third pass: count tabs per topic and update the map
      let totalTabs = 0;
      for (const [topicId, tabSet] of tabsByTopic.entries()) {
        if (this.tabCountMap.has(topicId)) {
          const count = tabSet.size;
          this.tabCountMap.set(topicId, count);
          totalTabs += count;
          console.log(`Topic ${topicId}: ${count} tabs`);
        }
      }
      
      // Log total tabs counted
      console.log(`Total tabs counted: ${totalTabs}`);
      
      // Update UI with the new counts
      this.updateTabCountUI();
      
      console.log("✅ Tab count update completed using storage-based method");
      return true;
    } catch (error) {
      console.error('❌ Error updating tab counts:', error);
      return false;
    }
  }

  /**
   * Check if a tab is a regular browsing tab
   */
  isRegularTab(url) {
    return url && 
           !url.startsWith("about:") && 
           !url.startsWith("chrome:") && 
           !url.startsWith("moz-extension:") &&
           url !== "about:blank";
  }

  /**
   * Get stable ID for a tab
   */
  async getStableTabId(tab) {
    try {
      // Use the TabIdentifier class to get the stable ID
      return await this.tabIdentifier.getStableTabId(tab);
    } catch (error) {
      console.error('Error getting stable tab ID:', error);
      return tab.url; // Fallback to using URL directly
    }
  }

  /**
   * Update the tab count UI without re-rendering the entire topic list
   */
  updateTabCountUI() {
    if (!this.elements.topicsList) return;
    
    const topicItems = this.elements.topicsList.querySelectorAll('.topic-item');
    
    topicItems.forEach(item => {
      const topicId = item.dataset.id;
      const tabCountBadge = item.querySelector('.tab-count-badge');
      
      if (tabCountBadge && topicId) {
        const count = this.tabCountMap.get(topicId) || 0;
        tabCountBadge.textContent = `(${count})`;
      }
    });
  }
  
  /**
   * Set a reference to the tab manager for better coordination
   */
  setTabManager(tabManager) {
    this.tabManager = tabManager;
    
    // Initial count using tab manager data
    if (tabManager) {
      this.updateTabCountsFromTabManager();
    }
  }
  
  /**
   * Alternative method to count tabs using the tab manager directly
   * This helps ensure consistency between what's shown and what's counted
   */
  async updateTabCountsFromTabManager() {
    if (!this.tabManager) return false;
    
    try {
      // Get all topics
      const topics = this.getTopics();
      
      // Create a new count map to avoid partial updates
      const newTabCountMap = new Map();
      
      // Initialize counts for all topics to zero
      topics.forEach(topic => {
        newTabCountMap.set(topic.id, 0);
      });
      
      // Ask tab manager for tabs per topic (most accurate method)
      const activeTopicId = this.getActiveTopicId();
      
      // Update active topic first for better perceived performance
      if (activeTopicId) {
        try {
          const topicTabs = await this.tabManager.getTabsForTopic(activeTopicId);
          newTabCountMap.set(activeTopicId, topicTabs.length);
          
          // Apply this immediately for better UX
          this.tabCountMap.set(activeTopicId, topicTabs.length);
          this.updateTabCountForTopic(activeTopicId);
        } catch (err) {
          console.warn(`Could not get tabs for active topic ${activeTopicId}:`, err);
        }
      }
      
      // Get counts for all other topics
      for (const topic of topics) {
        // Skip active topic as we've already counted it
        if (topic.id === activeTopicId) continue;
        
        try {
          const topicTabs = await this.tabManager.getTabsForTopic(topic.id);
          newTabCountMap.set(topic.id, topicTabs.length);
        } catch (err) {
          console.warn(`Could not get tabs for topic ${topic.id}:`, err);
        }
      }
      
      // Update the complete map at once
      this.tabCountMap = newTabCountMap;
      
      // Update UI for all topics
      this.updateTabCountUI();
      return true;
    } catch (error) {
      console.error('Error counting tabs from tab manager:', error);
      return false;
    }
  }
  
  /**
   * Update tab count for a specific topic in the UI
   */
  updateTabCountForTopic(topicId) {
    if (!this.elements.topicsList) return;
    
    const topicItem = this.elements.topicsList.querySelector(`.topic-item[data-id="${topicId}"]`);
    if (!topicItem) return;
    
    const tabCountBadge = topicItem.querySelector('.tab-count-badge');
    if (tabCountBadge) {
      const count = this.tabCountMap.get(topicId) || 0;
      tabCountBadge.textContent = `(${count})`;
    }
  }
  
  /**
   * Count tabs per topic from the stable ID to topic map
   */
  countTabsPerTopic(stableIdToTopicMap) {
    const counts = new Map();
    
    // Count occurrences of each topic ID
    for (const topicId of stableIdToTopicMap.values()) {
      if (!counts.has(topicId)) {
        counts.set(topicId, 0);
      }
      counts.set(topicId, counts.get(topicId) + 1);
    }
    
    return counts;
  }
  
  /**
   * Get tabs for a topic if tab manager isn't available or doesn't have this method
   */
  async getTabsForTopic(topicId) {
    try {
      // If we have a tab manager, use it
      if (this.tabManager && typeof this.tabManager.getTabsForTopic === 'function') {
        return await this.tabManager.getTabsForTopic(topicId);
      }
      
      // Otherwise, implement our own version
      // Get all tabs from browser
      const allTabs = await browser.tabs.query({});
      
      // Get tab assignments from storage
      const tabAssignments = await browser.storage.local.get('tabAssignments');
      const stableIdToTopicMap = tabAssignments.tabAssignments || {};
      
      // Find tabs for this topic
      const topicTabs = [];
      
      for (const tab of allTabs) {
        if (!this.isRegularTab(tab.url)) continue;
        
        try {
          // Get stable ID for this tab
          const stableId = await this.getStableTabId(tab);
          
          // Check if tab belongs to this topic
          if (stableIdToTopicMap[stableId] === topicId) {
            topicTabs.push(tab);
          }
        } catch (err) {
          console.error(`Error checking tab ${tab.id} for topic:`, err);
        }
      }
      
      return topicTabs;
    } catch (error) {
      console.error(`Error getting tabs for topic ${topicId}:`, error);
      return [];
    }
  }

  /**
   * Generate HTML for topics list
   */
  generateTopicsHTML(topics, activeTopicIndex) {
    if (topics.length === 0) {
      return "<li class='empty-list'>No topics yet. Add your first topic!</li>";
    }

    return topics.map((topic, index) => {
      const isSelected = index === activeTopicIndex;
      const tabCount = this.tabCountMap.get(topic.id) || 0;
      
      return `
        <li class="topic-item ${isSelected ? 'selected' : ''}" 
            data-id="${topic.id}" 
            data-index="${index}" 
            draggable="true">
          <span class="topic-text">
            ${this.escapeHTML(topic.name)} 
            <span class="tab-count-badge">(${tabCount})</span>
          </span>
          <div class="topic-actions">
            <button class="edit-btn" title="Edit Topic">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" title="Delete Topic">
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
   * Attach event listeners to topic elements
   */
  attachEventListeners(topics) {
    if (!this.elements.topicsList) return;

    const topicItems = this.elements.topicsList.querySelectorAll('.topic-item');
    
    topicItems.forEach((item) => {
      const index = parseInt(item.dataset.index, 10);
      const topicId = item.dataset.id;
      
      // Click on topic to select
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.edit-btn') && !e.target.closest('.delete-btn')) {
          this.handleTopicSelect(topicId);
        }
      });

      // Drag and drop events
      item.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
      item.addEventListener('dragover', (e) => this.handleDragOver(e));
      item.addEventListener('dragenter', (e) => this.handleDragEnter(e));
      item.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      item.addEventListener('drop', (e) => this.handleDrop(e, index, topics));
      item.addEventListener('dragend', () => this.handleDragEnd());

      // Edit button
      const editBtn = item.querySelector('.edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleTopicEdit(topicId, topics[index].name);
        });
      }

      // Delete button
      const deleteBtn = item.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleTopicDelete(topicId);
        });
      }
    });
  }

  /**
   * Handle topic selection
   */
  async handleTopicSelect(topicId) {
    try {
      // Capture current active topic
      const previousTopicId = this.getActiveTopicId();
      
      // Update active topic in state
      store.dispatch(actions.setActiveTopic(topicId));
      
      // Immediately show UI feedback for better UX - update counts for both topics
      // This will be refined later when the full count is updated
      if (previousTopicId) {
        // Previous topic likely has 0 visible tabs now
        this.tabCountMap.set(previousTopicId, 0);
        this.updateTabCountForTopic(previousTopicId);
      }
      
      // For the new topic, immediately update count if we have tab manager
      if (this.tabManager) {
        try {
          const topicTabs = await this.tabManager.getTabsForTopic(topicId);
          this.tabCountMap.set(topicId, topicTabs.length);
          this.updateTabCountForTopic(topicId);
        } catch (err) {
          // Silent fail, will be updated by the full count update
        }
      }
      
      // Update all tab counts for accuracy
      this.updateAllTabCounts();
      
      // Notify callback if provided
      if (this.callbacks.onTopicSelect) {
        const topic = selectors.selectTopicById(store.getState(), topicId);
        this.callbacks.onTopicSelect(topic);
      }
    } catch (error) {
      console.error('Error selecting topic:', error);
      showNotification('Error selecting topic', 'error');
    }
  }

  /**
   * Handle topic editing
   */
  handleTopicEdit(topicId, currentName) {
    if (!this.elements.editTopicForm || !this.elements.editTopicInput || !this.elements.editTopicId) {
      return;
    }
    
    const form = this.elements.editTopicForm;
    const input = this.elements.editTopicInput;
    const idInput = this.elements.editTopicId;
    
    form.style.display = 'block';
    input.value = currentName;
    idInput.value = topicId;
    input.focus();
  }

  /**
   * Save edited topic
   */
  async saveEditedTopic(topicId, newName) {
    try {
      if (!newName.trim()) {
        throw new Error('Topic name cannot be empty');
      }
      
      // Update topic in state
      await this.topicService.updateTopic(topicId, { name: newName.trim() });
      
      // Hide edit form
      if (this.elements.editTopicForm) {
        this.elements.editTopicForm.style.display = 'none';
      }
      
      // Show success notification
      showNotification('Topic updated', 'success');
      
      // Notify callback if provided
      if (this.callbacks.onTopicEdit) {
        const state = store.getState();
        const topic = selectors.selectTopicById(state, topicId);
        this.callbacks.onTopicEdit(topic);
      }
    } catch (error) {
      console.error('Error updating topic:', error);
      showNotification('Error updating topic: ' + error.message, 'error');
    }
  }

  /**
   * Handle topic deletion
   */
  async handleTopicDelete(topicId) {
    try {
      const state = store.getState();
      const topics = state.topics;
      
      // Don't allow deleting the last topic
      if (topics.length <= 1) {
        showNotification("Can't delete the last topic", 'warning');
        return;
      }
      
      // Confirm deletion
      if (!confirm("Delete this topic and its categories?")) {
        return;
      }
      
      // Delete topic in state
      await this.topicService.deleteTopic(topicId);
      
      // Show success notification
      showNotification('Topic deleted', 'success');
      
      // Notify callback if provided
      if (this.callbacks.onTopicDelete) {
        this.callbacks.onTopicDelete(topicId);
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
      showNotification('Error deleting topic: ' + error.message, 'error');
    }
  }

  // Drag and drop handlers
  handleDragStart(e, index) {
    this.dragState.draggedIndex = index;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  handleDragEnter(e) {
    e.preventDefault();
    const item = e.currentTarget;
    if (!item.classList.contains('drag-over')) {
      item.classList.add('drag-over');
    }
  }

  handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  async handleDrop(e, dropIndex, topics) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const draggedIndex = this.dragState.draggedIndex;
    if (draggedIndex === -1 || draggedIndex === dropIndex) return;

    try {
      // Get the topic IDs
      const draggedTopicId = topics[draggedIndex].id;
      
      // Create a new array with the reordered topics
      const newOrder = [...topics];
      const [draggedTopic] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(dropIndex, 0, draggedTopic);
      
      // Update the state with the new order
      store.dispatch(actions.setTopics({ topics: newOrder }));
      
      // Notify callback if provided
      if (this.callbacks.onTopicReorder) {
        this.callbacks.onTopicReorder(draggedIndex, dropIndex);
      }
    } catch (error) {
      console.error('Error reordering topics:', error);
      showNotification('Error reordering topics', 'error');
    }
  }

  handleDragEnd() {
    this.dragState.draggedIndex = -1;
    const items = this.elements.topicsList.querySelectorAll('.topic-item');
    items.forEach(item => {
      item.classList.remove('dragging', 'drag-over');
    });
  }

  /**
   * Setup event listeners for the topic form
   */
  setupTopicFormListeners() {
    if (this.elements.addTopicBtn) {
      this.elements.addTopicBtn.addEventListener('click', () => {
        this.openAddTopicModal();
      });
    }

    if (this.elements.saveEditTopicBtn) {
      this.elements.saveEditTopicBtn.addEventListener('click', () => {
        const input = this.elements.editTopicInput;
        const idInput = this.elements.editTopicId;
        
        if (input && idInput) {
          const topicId = idInput.value;
          const newName = input.value.trim();
          
          if (topicId && newName) {
            this.saveEditedTopic(topicId, newName);
          }
        }
      });
    }

    if (this.elements.cancelEditTopicBtn) {
      this.elements.cancelEditTopicBtn.addEventListener('click', () => {
        if (this.elements.editTopicForm) {
          this.elements.editTopicForm.style.display = 'none';
        }
      });
    }
  }

  /**
   * Open the add topic modal
   */
  openAddTopicModal() {
    const modalUrl = browser.runtime.getURL('modals/add-topic/add-topic.html');
    
    browser.windows.create({
      url: modalUrl,
      type: 'popup',
      width: 500,  // Increased from 400
      height: 400, // Increased from 300
      allowScriptsToClose: true,
      left: screen.width / 2 - 250,  // Adjusted for new width
      top: screen.height / 2 - 200   // Adjusted for new height
    }).catch(err => {
      console.error('Error opening modal:', err);
      showNotification('Failed to open add topic dialog', 'error');
    });
  }

  /**
   * Handle response from the add topic modal
   */
  async handleModalResponse(message) {
    try {
      if (!message.success || !message.topicName) {
        return;
      }
      
      // Create new topic
      const name = message.topicName.trim();
      let initialCategories = [];
      
      // Add standard categories if provided
      if (message.categorySet && message.categorySet.list_of_categories) {
        initialCategories = message.categorySet.list_of_categories;
      }
      
      // Create topic in state
      const newTopic = await this.topicService.createTopic(name, initialCategories);
      
      // Set as active topic
      if (newTopic && newTopic.id) {
        await this.topicService.setActiveTopic(newTopic.id);
      }
      
      // Show success notification
      showNotification('Topic created: ' + name, 'success');
    } catch (error) {
      console.error('Error handling modal response:', error);
      showNotification('Error creating topic', 'error');
    }
  }
}
