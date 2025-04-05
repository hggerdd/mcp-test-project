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

    // Set up store subscription
    this.unsubscribe = store.subscribe(this.handleStateChange.bind(this));

    // Set up message listener for modal responses
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'modalResponse') {
        this.handleModalResponse(message);
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
      
      return `
        <li class="topic-item ${isSelected ? 'selected' : ''}" 
            data-id="${topic.id}" 
            data-index="${index}" 
            draggable="true">
          <span class="topic-text">
            ${this.escapeHTML(topic.name)} 
            <span class="tab-count-badge">(0)</span>
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
      // Update active topic in state
      store.dispatch(actions.setActiveTopic(topicId));
      
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
      width: 400,
      height: 300,
      allowScriptsToClose: true,
      left: screen.width / 2 - 200,
      top: screen.height / 2 - 150
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
