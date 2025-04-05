/**
 * State-Integrated Tab Manager
 * 
 * This manager handles Firefox tab operations and integrates with the state management system.
 * It tracks which tabs belong to which topics and controls their visibility.
 * Uses stable tab identification that persists across browser restarts and page reloads.
 */

import { 
  store,
  actions,
  selectors,
  showNotification
} from '../../../index.js';
import { TabIdentifier } from '../../../utils/tab-identifier.js';

export class StateTabManager {
  constructor() {
    this.stableIdToTopicMap = new Map(); // Maps stable tab IDs to topic IDs
    this.tabIdentifier = new TabIdentifier(); // Tab identifier for stable IDs
    this.hasTabHideAPI = this.checkTabHideAPI();
    this.DEBUG = true;
    
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
    // Only respond to changes in activeTopicId
    if (state.activeTopicId && state.meta && state.meta.lastChanged === 'activeTopicId') {
      this.log(`Detected active topic change to: ${state.activeTopicId}`);
      this.handleTopicChange(state.activeTopicId);
    }
  }

  /**
   * Check if the tab hide API is available
   */
  checkTabHideAPI() {
    try {
      return typeof browser !== 'undefined' && 
             browser.tabs && 
             typeof browser.tabs.hide === 'function' &&
             typeof browser.tabs.show === 'function';
    } catch (e) {
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
   * Log a message with the TabManager prefix
   */
  log(...args) {
    if (this.DEBUG) console.log("[StateTabManager]", ...args);
  }

  /**
   * Initialize the tab manager
   */
  async initialize() {
    if (!this.hasTabHideAPI) {
      this.log("[ERROR] Tab Hide API not available");
      showNotification('Tab hiding API not available, tab management is disabled', 'error');
      return false;
    }
    
    try {
      this.log("Initializing tab manager...");
      
      // Load previously saved tab assignments
      await this.loadTabAssignments();
      
      // Get current state
      const state = store.getState();
      const topics = state.topics;
      const activeTopicId = state.activeTopicId;
      
      // Get all tabs
      const allTabs = await browser.tabs.query({});
      const regularTabs = allTabs.filter(tab => this.isRegularTab(tab.url));
      this.log(`Found ${regularTabs.length} regular tabs`);
      
      // Set initial topic if there is an active topic
      const activeTopic = selectors.selectActiveTopic(state);
      
      // Assign tabs to topics (only for tabs not yet assigned)
      await this.assignInitialTabs(regularTabs, topics, activeTopicId);
      
      // Enforce visibility based on current topic
      if (activeTopicId) {
        await this.enforceTabVisibility(activeTopicId);
      }
      
      // Setup event listeners
      this.setupTabListeners();
      
      this.log(`Initialization complete, active topic: ${activeTopicId}`);
      return true;
    } catch (e) {
      this.log(`[ERROR] Initialization failed: ${e.message}`);
      showNotification('Failed to initialize tab management', 'error');
      return false;
    }
  }

  /**
   * Assign initial tabs to topics
   */
  async assignInitialTabs(regularTabs, topics, activeTopicId) {
    this.log(`Assigning initial tabs to topics`);
    const assignedTabs = new Set();
    
    // Process all regular tabs
    for (const tab of regularTabs) {
      // Generate a stable ID for the tab
      const stableId = await this.tabIdentifier.getStableTabId(tab);
      
      // If this stable ID isn't assigned to any topic yet
      if (!this.stableIdToTopicMap.has(stableId)) {
        if (activeTopicId) {
          // Assign to active topic
          this.stableIdToTopicMap.set(stableId, activeTopicId);
          assignedTabs.add(stableId);
          this.log(`Assigned tab ${tab.id} (stable ID: ${stableId}) to active topic ${activeTopicId}`);
        } else if (topics.length > 0) {
          // If no active topic but we have topics, assign to first topic
          const firstTopicId = topics[0].id;
          this.stableIdToTopicMap.set(stableId, firstTopicId);
          assignedTabs.add(stableId);
          this.log(`Assigned tab ${tab.id} (stable ID: ${stableId}) to first topic ${firstTopicId}`);
        }
      }
    }
    
    // Persist the assignments
    await this.persistTabAssignments();
    
    // Log summary of tab assignments
    this.logTabAssignments();
  }

  /**
   * Enforce tab visibility based on the active topic
   */
  async enforceTabVisibility(activeTopicId) {
    try {
      if (!activeTopicId) return;
      
      this.log(`Enforcing tab visibility for topic ${activeTopicId}`);
      
      const allTabs = await browser.tabs.query({});
      const regularTabs = allTabs.filter(tab => this.isRegularTab(tab.url));
      
      const tabsToShow = [];
      const tabsToHide = [];
      
      // Categorize tabs
      for (const tab of regularTabs) {
        // Get the stable ID for this tab
        const stableId = await this.tabIdentifier.getStableTabId(tab);
        
        // Get the topic ID assigned to this stable ID
        const tabTopicId = this.stableIdToTopicMap.get(stableId);
        
        if (tabTopicId === activeTopicId) {
          if (tab.hidden) {
            tabsToShow.push(tab.id);
          }
        } else {
          if (!tab.hidden) {
            tabsToHide.push(tab.id);
          }
        }
      }
      
      // First hide tabs that should be hidden
      if (tabsToHide.length > 0) {
        this.log(`Hiding ${tabsToHide.length} tabs not in active topic`);
        await browser.tabs.hide(tabsToHide);
      }
      
      // Then show tabs that should be visible
      if (tabsToShow.length > 0) {
        this.log(`Showing ${tabsToShow.length} tabs for active topic`);
        await browser.tabs.show(tabsToShow);
      }
      
      // Verify the results
      await this.verifyTabVisibility(activeTopicId);
      
      // Notify that tab visibility has changed
      if (tabsToShow.length > 0 || tabsToHide.length > 0) {
        try {
          browser.runtime.sendMessage({ 
            type: 'tabVisibilityChanged',
            activeTopicId,
            tabsShown: tabsToShow.length,
            tabsHidden: tabsToHide.length
          });
        } catch (error) {
          this.log(`[WARNING] Could not send tab visibility change message: ${error.message}`);
        }
      }
      
    } catch (e) {
      this.log(`[ERROR] enforceTabVisibility failed: ${e.message}`);
      showNotification('Error enforcing tab visibility', 'error');
    }
  }

  /**
   * Handle topic change
   */
  async handleTopicChange(newTopicId) {
    if (!this.hasTabHideAPI || !newTopicId) return;
    
    try {
      this.log(`Switching to topic ${newTopicId}`);
      
      // Get all tabs
      const allTabs = await browser.tabs.query({});
      const regularTabs = allTabs.filter(tab => this.isRegularTab(tab.url));
      
      // Determine which tabs to hide/show
      const tabsToHide = [];
      const tabsToShow = [];
      const currentTopicTabs = [];
      
      for (const tab of regularTabs) {
        // Get the stable ID for this tab
        const stableId = await this.tabIdentifier.getStableTabId(tab);
        
        // Get the topic ID assigned to this stable ID
        const tabTopicId = this.stableIdToTopicMap.get(stableId);
        
        // If tab belongs to new topic and is hidden, show it
        if (tabTopicId === newTopicId) {
          currentTopicTabs.push(tab);
          if (tab.hidden) {
            tabsToShow.push(tab.id);
          }
        } 
        // If tab doesn't belong to new topic and is visible, hide it
        else if (tabTopicId !== newTopicId && !tab.hidden) {
          tabsToHide.push(tab.id);
        }
      }
      
      // First hide tabs that should be hidden
      if (tabsToHide.length > 0) {
        this.log(`Hiding ${tabsToHide.length} tabs not in new topic`);
        await browser.tabs.hide(tabsToHide);
      }
      
      // Then show tabs for current topic
      if (tabsToShow.length > 0) {
        this.log(`Showing ${tabsToShow.length} tabs for new topic`);
        await browser.tabs.show(tabsToShow);
        
        // Activate a tab if we have any
        if (currentTopicTabs.length > 0) {
          const tabToActivate = currentTopicTabs[0].id;
          await browser.tabs.update(tabToActivate, { active: true });
          this.log(`Activated tab ${tabToActivate}`);
        }
      } else if (currentTopicTabs.length === 0) {
        // ONLY Create default tab if topic has ZERO tabs
        this.log(`Topic ${newTopicId} has no tabs visible, checking if it truly has no tabs...`);
        
        // Double check that this topic has no tabs at all before creating default
        const allTopicTabs = await this.getTabsForTopic(newTopicId);
        if (allTopicTabs.length === 0) {
          this.log(`Confirmed topic ${newTopicId} has zero tabs, creating default tab`);
          await this.createDefaultTab(newTopicId);
        } else {
          this.log(`Topic ${newTopicId} has ${allTopicTabs.length} tabs but none are visible, showing them`);
          const tabIdsToShow = allTopicTabs.map(tab => tab.id);
          await browser.tabs.show(tabIdsToShow);
          
          // Activate one of them
          await browser.tabs.update(allTopicTabs[0].id, { active: true });
        }
      }
      
      // Verify final state
      await this.verifyTabVisibility(newTopicId);
      
      // Notify that topic tabs have changed
      try {
        browser.runtime.sendMessage({ 
          type: 'topicChanged',
          topicId: newTopicId,
          tabsShown: tabsToShow.length,
          tabsHidden: tabsToHide.length
        });
      } catch (error) {
        this.log(`[WARNING] Could not send topic change message: ${error.message}`);
      }
      
      return true;
    } catch (e) {
      this.log(`[ERROR] handleTopicChange failed: ${e.message}`);
      showNotification('Error switching topic tabs', 'error');
      return false;
    }
  }

  /**
   * Create a default tab for a topic
   */
  async createDefaultTab(topicId) {
    try {
      // Only create default tab if topic has zero tabs - double check
      const allTabs = await browser.tabs.query({});
      const tabsForThisTopic = [];
      
      for (const tab of allTabs) {
        if (!this.isRegularTab(tab.url)) continue;
        
        const stableId = await this.tabIdentifier.getStableTabId(tab);
        if (this.stableIdToTopicMap.get(stableId) === topicId) {
          tabsForThisTopic.push(tab);
        }
      }
      
      // Don't create default tab if topic already has tabs
      if (tabsForThisTopic.length > 0) {
        this.log(`Topic ${topicId} already has ${tabsForThisTopic.length} tabs, skipping default tab creation`);
        return null;
      }
      
      this.log(`Creating default tab for topic ${topicId}`);
      
      // Create a unique URL for each topic to prevent mixing up default tabs
      // Adding a hash parameter with the topic ID ensures each topic gets a unique default tab
      const defaultUrl = `https://www.google.de/#topicId=${topicId}`;
      
      const newTab = await browser.tabs.create({
        url: defaultUrl,
        active: true
      });
      
      // Generate a stable ID and assign to topic
      const stableId = await this.tabIdentifier.getStableTabId(newTab);
      this.stableIdToTopicMap.set(stableId, topicId);
      this.log(`Assigned new tab ${newTab.id} (stable ID: ${stableId}) to topic ${topicId}`);
      
      // Persist the assignments
      await this.persistTabAssignments();
      
      return newTab.id;
    } catch (e) {
      this.log(`[ERROR] createDefaultTab failed: ${e.message}`);
      showNotification('Failed to create default tab', 'error');
      return null;
    }
  }

  /**
   * Close all tabs for a topic
   */
  async closeTabsForTopic(topicId) {
    try {
      // Find all tabs for this topic
      const allTabs = await browser.tabs.query({});
      const tabsToClose = [];
      const stableIdsToRemove = [];
      
      for (const tab of allTabs) {
        if (!this.isRegularTab(tab.url)) continue;
        
        const stableId = await this.tabIdentifier.getStableTabId(tab);
        if (this.stableIdToTopicMap.get(stableId) === topicId) {
          tabsToClose.push(tab.id);
          stableIdsToRemove.push(stableId);
        }
      }
      
      if (tabsToClose.length > 0) {
        this.log(`Closing ${tabsToClose.length} tabs for topic ${topicId}`);
        
        // Remove topic assignments for these tabs
        for (const stableId of stableIdsToRemove) {
          this.stableIdToTopicMap.delete(stableId);
        }
        
        // Persist assignments before closing tabs
        await this.persistTabAssignments();
        
        // Close the tabs
        await browser.tabs.remove(tabsToClose);
        
        // Notify that tabs were removed for this topic
        try {
          browser.runtime.sendMessage({ 
            type: 'topicTabsClosed',
            topicId,
            tabCount: tabsToClose.length
          });
        } catch (error) {
          this.log(`[WARNING] Could not send topic tabs closed message: ${error.message}`);
        }
      }
      
      return true;
    } catch (e) {
      this.log(`[ERROR] closeTabsForTopic failed: ${e.message}`);
      showNotification('Failed to close tabs for topic', 'error');
      return false;
    }
  }

  /**
   * Setup tab listeners
   */
  setupTabListeners() {
    // Tab created
    browser.tabs.onCreated.addListener(async (tab) => {
      if (!this.isRegularTab(tab.url)) return;
      
      // Get the active topic ID
      const activeTopicId = store.getState().activeTopicId;
      
      // Generate a stable ID for this tab
      const stableId = await this.tabIdentifier.getStableTabId(tab);
      
      // Only assign tab to a topic if it's not already assigned
      if (!this.stableIdToTopicMap.has(stableId) && activeTopicId) {
        this.log(`New tab created: ${tab.id} (${tab.url}), stable ID: ${stableId}`);
        
        // Assign to active topic
        this.stableIdToTopicMap.set(stableId, activeTopicId);
        this.log(`Assigned new tab with stable ID ${stableId} to active topic ${activeTopicId}`);
        
        // Persist the assignments
        await this.persistTabAssignments();
        
        // Notify about the new tab assignment
        try {
          browser.runtime.sendMessage({ 
            type: 'tabAssigned',
            tabId: tab.id,
            stableId,
            topicId: activeTopicId
          });
        } catch (error) {
          this.log(`[WARNING] Could not send tab assignment message: ${error.message}`);
        }
        
        // Enforce visibility to ensure it matches topic
        await this.enforceTabVisibility(activeTopicId);
      }
    });
    
    // Tab removed
    browser.tabs.onRemoved.addListener(async (tabId) => {
      // We need to find and clean up any stable IDs that were mapped to this tab
      const stableIdsToRemove = [];
      
      for (const stableId of this.tabIdentifier.stableIdToTabIdMap.keys()) {
        if (this.tabIdentifier.stableIdToTabIdMap.get(stableId) === tabId) {
          stableIdsToRemove.push(stableId);
        }
      }
      
      // Clean up mappings
      for (const stableId of stableIdsToRemove) {
        const topicId = this.stableIdToTopicMap.get(stableId);
        this.log(`Tab ${tabId} with stable ID ${stableId} removed from topic ${topicId}`);
        
        // Remove from mapping
        this.tabIdentifier.clearTabMapping(tabId);
        
        // Note: We keep the stableIdToTopicMap intact so that if a tab with the same 
        // stable ID is re-opened later, it will return to its original topic
      }
    });
    
    // Tab updated
    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.url && this.isRegularTab(changeInfo.url)) {
        this.log(`Tab URL updated: ${tabId} -> ${changeInfo.url}`);
        
        // Check if the URL change is significant enough to generate a new stable ID
        const hasSignificantChange = await this.tabIdentifier.hasTabChangedSignificantly(tab);
        
        if (hasSignificantChange) {
          // Generate a new stable ID for this tab
          const newStableId = await this.tabIdentifier.updateStableId(tab);
          
          // Get the active topic ID
          const activeTopicId = store.getState().activeTopicId;
          
          // Assign to active topic if not already assigned
          if (!this.stableIdToTopicMap.has(newStableId) && activeTopicId) {
            this.stableIdToTopicMap.set(newStableId, activeTopicId);
            this.log(`Assigned updated tab with new stable ID ${newStableId} to active topic ${activeTopicId}`);
            
            // Persist the assignments
            await this.persistTabAssignments();
            
            // Enforce visibility to ensure it matches topic
            await this.enforceTabVisibility(activeTopicId);
          }
        }
      }
    });
  }

  /**
   * Verify tab visibility
   */
  async verifyTabVisibility(activeTopicId) {
    try {
      const allTabs = await browser.tabs.query({});
      const regularTabs = allTabs.filter(tab => this.isRegularTab(tab.url));
      
      const visibleTabs = regularTabs.filter(tab => !tab.hidden);
      const hiddenTabs = regularTabs.filter(tab => tab.hidden);
      
      this.log(`Tab state: ${visibleTabs.length} visible, ${hiddenTabs.length} hidden`);
      
      // Check for incorrect visibility
      const wrongVisibleTabs = [];
      const wrongHiddenTabs = [];
      
      // Check visible tabs
      for (const tab of visibleTabs) {
        const stableId = await this.tabIdentifier.getStableTabId(tab);
        const topic = this.stableIdToTopicMap.get(stableId) || 'none';
        const isCorrect = topic === activeTopicId;
        
        this.log(`Visible: Tab ${tab.id} (stable ID: ${stableId}) in topic ${topic} (${isCorrect ? 'CORRECT' : 'WRONG'})`);
        
        if (!isCorrect) {
          wrongVisibleTabs.push(tab);
        }
      }
      
      // Check hidden tabs
      for (const tab of hiddenTabs) {
        const stableId = await this.tabIdentifier.getStableTabId(tab);
        const topic = this.stableIdToTopicMap.get(stableId);
        
        if (topic === activeTopicId) {
          wrongHiddenTabs.push(tab);
        }
      }
      
      // Report errors
      if (wrongVisibleTabs.length > 0) {
        this.log(`ERROR: ${wrongVisibleTabs.length} tabs visible but in wrong topic!`);
        
        // Try to fix the issue
        const tabIdsToHide = wrongVisibleTabs.map(tab => tab.id);
        await browser.tabs.hide(tabIdsToHide);
        this.log(`Attempted to hide ${tabIdsToHide.length} incorrectly visible tabs`);
      }
      
      if (wrongHiddenTabs.length > 0) {
        this.log(`ERROR: ${wrongHiddenTabs.length} tabs hidden but should be visible!`);
        
        // Try to fix the issue
        const tabIdsToShow = wrongHiddenTabs.map(tab => tab.id);
        await browser.tabs.show(tabIdsToShow);
        this.log(`Attempted to show ${tabIdsToShow.length} incorrectly hidden tabs`);
      }
      
      return {
        correct: wrongVisibleTabs.length === 0 && wrongHiddenTabs.length === 0,
        wrongVisibleTabs,
        wrongHiddenTabs
      };
    } catch (e) {
      this.log(`[ERROR] verifyTabVisibility failed: ${e.message}`);
      return { correct: false };
    }
  }

  /**
   * Log tab assignments
   */
  logTabAssignments() {
    // Group tabs by topic
    const tabsByTopic = new Map();
    
    for (const [stableId, topicId] of this.stableIdToTopicMap.entries()) {
      if (!tabsByTopic.has(topicId)) {
        tabsByTopic.set(topicId, []);
      }
      tabsByTopic.get(topicId).push(stableId);
    }
    
    // Log summary
    this.log(`Current tab assignments by topic:`);
    for (const [topicId, stableIds] of tabsByTopic.entries()) {
      this.log(`Topic ${topicId}: ${stableIds.length} tabs - Stable IDs: ${stableIds.join(', ')}`);
    }
  }

  /**
   * Validate tab assignments
   */
  async validateTabAssignments() {
    try {
      this.log(`Validating tab assignments...`);
      
      // Get all current tabs
      const allTabs = await browser.tabs.query({});
      const regularTabs = allTabs.filter(tab => this.isRegularTab(tab.url));
      
      // Track changes
      let changes = 0;
      
      // Get active topic ID
      const activeTopicId = store.getState().activeTopicId;
      if (!activeTopicId) return true;
      
      // Ensure all regular tabs have a topic assignment
      for (const tab of regularTabs) {
        const stableId = await this.tabIdentifier.getStableTabId(tab);
        
        if (!this.stableIdToTopicMap.has(stableId)) {
          this.log(`Assigning untracked tab ${tab.id} (stable ID: ${stableId}) to active topic ${activeTopicId}`);
          this.stableIdToTopicMap.set(stableId, activeTopicId);
          changes++;
        }
      }
      
      // Clean up stale stable ID references
      // Note: We keep stableIdToTopicMap entries even if the tab is closed, 
      // as they may be needed if the tab is reopened later
      
      if (changes > 0) {
        this.log(`Made ${changes} changes to tab assignments`);
        // Persist the assignments
        await this.persistTabAssignments();
      } else {
        this.log(`Tab assignments are valid, no changes needed`);
      }
      
      return true;
    } catch (e) {
      this.log(`[ERROR] validateTabAssignments failed: ${e.message}`);
      return false;
    }
  }
  
  /**
   * Persist tab assignments to storage
   * This allows tab assignments to survive extension restarts
   */
  async persistTabAssignments() {
    try {
      const assignments = Object.fromEntries(this.stableIdToTopicMap);
      await browser.storage.local.set({ tabAssignments: assignments });
      this.log('Tab assignments persisted to storage');
      
      // Send a message to notify other components that tab assignments have changed
      try {
        browser.runtime.sendMessage({ type: 'tabAssignmentsChanged' });
      } catch (error) {
        this.log(`[WARNING] Could not send tab assignments change message: ${error.message}`);
      }
      
      return true;
    } catch (e) {
      this.log(`[ERROR] Failed to persist tab assignments: ${e.message}`);
      return false;
    }
  }
  
  /**
   * Load tab assignments from storage
   */
  async loadTabAssignments() {
    try {
      const data = await browser.storage.local.get('tabAssignments');
      if (data && data.tabAssignments) {
        this.stableIdToTopicMap = new Map(Object.entries(data.tabAssignments));
        this.log(`Loaded ${this.stableIdToTopicMap.size} tab assignments from storage`);
      }
      return true;
    } catch (e) {
      this.log(`[ERROR] Failed to load tab assignments: ${e.message}`);
      return false;
    }
  }

/**
 * Get all tabs for a specific topic
 * 
 * @param {string} topicId - Topic ID to get tabs for
 * @returns {Promise<Array>} - Array of tab objects for the topic
 */
async getTabsForTopic(topicId) {
    try {
      const allTabs = await browser.tabs.query({});
      const topicTabs = [];
      
      for (const tab of allTabs) {
        if (!this.isRegularTab(tab.url)) continue;
        
        const stableId = await this.tabIdentifier.getStableTabId(tab);
        if (this.stableIdToTopicMap.get(stableId) === topicId) {
          topicTabs.push(tab);
        }
      }
      
      this.log(`Found ${topicTabs.length} tabs for topic ${topicId}`);
      return topicTabs;
    } catch (e) {
      this.log(`[ERROR] getTabsForTopic failed: ${e.message}`);
      return [];
    }
  }
}