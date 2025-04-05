/**
 * State-Integrated Tab Manager
 * 
 * This manager handles Firefox tab operations and integrates with the state management system.
 * It tracks which tabs belong to which topics and controls their visibility.
 */

import { 
  store,
  actions,
  selectors,
  showNotification
} from '../../../index.js';

export class StateTabManager {
  constructor() {
    this.tabToTopicMap = new Map(); // Maps tab IDs to topic IDs
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
    
    // First, try to assign tabs based on URL to specific topics
    // (This would require knowledge of which URLs belong to which topics)
    // For now, we'll just assign all tabs to the active topic if there is one
    
    if (activeTopicId) {
      regularTabs.forEach(tab => {
        if (!this.tabToTopicMap.has(tab.id)) {
          this.tabToTopicMap.set(tab.id, activeTopicId);
          assignedTabs.add(tab.id);
          this.log(`Assigned tab ${tab.id} to active topic ${activeTopicId}`);
        }
      });
    } else if (topics.length > 0) {
      // If no active topic but we have topics, assign to first topic
      const firstTopicId = topics[0].id;
      regularTabs.forEach(tab => {
        if (!this.tabToTopicMap.has(tab.id)) {
          this.tabToTopicMap.set(tab.id, firstTopicId);
          assignedTabs.add(tab.id);
          this.log(`Assigned tab ${tab.id} to first topic ${firstTopicId}`);
        }
      });
    }
    
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
      regularTabs.forEach(tab => {
        const tabTopicId = this.tabToTopicMap.get(tab.id);
        
        if (tabTopicId === activeTopicId) {
          if (tab.hidden) {
            tabsToShow.push(tab.id);
          }
        } else {
          if (!tab.hidden) {
            tabsToHide.push(tab.id);
          }
        }
      });
      
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
      
      for (const tab of regularTabs) {
        const tabTopicId = this.tabToTopicMap.get(tab.id);
        
        // If tab belongs to new topic and is hidden, show it
        if (tabTopicId === newTopicId && tab.hidden) {
          tabsToShow.push(tab.id);
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
      const currentTopicTabs = regularTabs.filter(tab => 
        this.tabToTopicMap.get(tab.id) === newTopicId
      );
      
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
        // Create default tab if topic has no tabs
        await this.createDefaultTab(newTopicId);
      }
      
      // Verify final state
      await this.verifyTabVisibility(newTopicId);
      
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
      this.log(`Creating default tab for topic ${topicId}`);
      const newTab = await browser.tabs.create({
        url: 'https://www.google.com',
        active: true
      });
      
      // Assign to topic and keep visible
      this.tabToTopicMap.set(newTab.id, topicId);
      this.log(`Assigned new tab ${newTab.id} to topic ${topicId}`);
      
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
      const tabIdsToClose = [];
      
      for (const [tabId, mappedTopicId] of this.tabToTopicMap.entries()) {
        if (mappedTopicId === topicId) {
          tabIdsToClose.push(parseInt(tabId));
        }
      }
      
      if (tabIdsToClose.length > 0) {
        this.log(`Closing ${tabIdsToClose.length} tabs for topic ${topicId}`);
        await browser.tabs.remove(tabIdsToClose);
        
        // Tab removal listener will handle cleanup of tabToTopicMap
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
      
      // Only assign tab to a topic if it's not already assigned
      if (!this.tabToTopicMap.has(tab.id) && activeTopicId) {
        this.log(`New tab created: ${tab.id} (${tab.url})`);
        
        // Assign to active topic
        this.tabToTopicMap.set(tab.id, activeTopicId);
        this.log(`Assigned new tab ${tab.id} to active topic ${activeTopicId}`);
        
        // Enforce visibility to ensure it matches topic
        await this.enforceTabVisibility(activeTopicId);
      }
    });
    
    // Tab removed
    browser.tabs.onRemoved.addListener(async (tabId) => {
      // Check if this tab was mapped
      if (this.tabToTopicMap.has(tabId)) {
        const topicId = this.tabToTopicMap.get(tabId);
        this.log(`Tab ${tabId} removed from topic ${topicId}`);
        
        // Remove from mapping
        this.tabToTopicMap.delete(tabId);
      }
    });
    
    // Tab updated
    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.url && this.isRegularTab(changeInfo.url)) {
        this.log(`Tab URL updated: ${tabId} -> ${changeInfo.url}`);
        
        // Get the active topic ID
        const activeTopicId = store.getState().activeTopicId;
        
        // If tab doesn't have an assigned topic yet, assign it
        if (!this.tabToTopicMap.has(tabId) && activeTopicId) {
          this.tabToTopicMap.set(tabId, activeTopicId);
          this.log(`Assigned updated tab ${tabId} to active topic ${activeTopicId}`);
          
          // Enforce visibility to ensure it matches topic
          await this.enforceTabVisibility(activeTopicId);
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
      const wrongVisibleTabs = visibleTabs.filter(tab => 
        this.tabToTopicMap.get(tab.id) !== activeTopicId
      );
      
      const wrongHiddenTabs = hiddenTabs.filter(tab => 
        this.tabToTopicMap.get(tab.id) === activeTopicId
      );
      
      // Log visible tabs
      visibleTabs.forEach(tab => {
        const topic = this.tabToTopicMap.get(tab.id) || 'none';
        const isCorrect = topic === activeTopicId;
        this.log(`Visible: Tab ${tab.id} in topic ${topic} (${isCorrect ? 'CORRECT' : 'WRONG'})`);
      });
      
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
    
    for (const [tabId, topicId] of this.tabToTopicMap.entries()) {
      if (!tabsByTopic.has(topicId)) {
        tabsByTopic.set(topicId, []);
      }
      tabsByTopic.get(topicId).push(tabId);
    }
    
    // Log summary
    this.log(`Current tab assignments by topic:`);
    for (const [topicId, tabIds] of tabsByTopic.entries()) {
      this.log(`Topic ${topicId}: ${tabIds.length} tabs - IDs: ${tabIds.join(', ')}`);
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
        if (!this.tabToTopicMap.has(tab.id)) {
          this.log(`Assigning untracked tab ${tab.id} to active topic ${activeTopicId}`);
          this.tabToTopicMap.set(tab.id, activeTopicId);
          changes++;
        }
      }
      
      // Clean up stale tab references
      const validTabIds = new Set(regularTabs.map(tab => tab.id));
      const toDelete = [];
      
      for (const [tabId] of this.tabToTopicMap.entries()) {
        if (!validTabIds.has(parseInt(tabId))) {
          toDelete.push(tabId);
          changes++;
        }
      }
      
      // Delete stale entries
      for (const tabId of toDelete) {
        this.log(`Removing stale tab ${tabId} from mapping`);
        this.tabToTopicMap.delete(tabId);
      }
      
      if (changes > 0) {
        this.log(`Made ${changes} changes to tab assignments`);
      } else {
        this.log(`Tab assignments are valid, no changes needed`);
      }
      
      return true;
    } catch (e) {
      this.log(`[ERROR] validateTabAssignments failed: ${e.message}`);
      return false;
    }
  }
}
