# Simple Topics - Firefox Tab & Bookmark Manager

## Overview
Simple Topics is a Firefox extension for organizing tabs and bookmarks based on topics. It helps users manage their browser content by categorizing tabs and bookmarks, showing only what is relevant to the current topic of interest. The extension provides a modular, state-managed architecture for robust bookmark and tab management.

## Key Features
- **Topic Management**: Create, edit, and delete custom topics to organize your browsing
- **Tab Organization**: Group tabs under specific topics for better focus
- **Bookmark Management**: Save and organize bookmarks within categories for each topic
- **Category Sets**: Create reusable sets of categories to quickly set up new topics
- **Sidebar Integration**: Access all functionality through a convenient Firefox sidebar (Ctrl+Shift+S)
- **Data Portability**: Import and export your entire topic configuration

## Architecture
The extension follows a state-managed architecture that separates concerns:

```
/
├── background/      (Background processes)
│   ├── background.js    (Main background script)
│   ├── background.html  (HTML wrapper for module support)
│   └── messages.js      (Message types and handling)
├── components/      (Reusable UI components)
├── models/          (Data models)
│   ├── topic.js        (Topic data model)
│   ├── category.js     (Category data model)
│   └── bookmark.js     (Bookmark data model)
├── services/        (Data access and manipulation)
│   ├── storage-service.js   (Centralized storage operations)
│   ├── topic-service.js     (Topic operations)
│   ├── category-service.js  (Category operations) 
│   ├── bookmark-service.js  (Bookmark operations)
│   └── error/             (Error handling)
│       ├── error-service.js  (Centralized error handling)
│       └── error-types.js    (Error type definitions)
├── state/           (State management)
│   ├── store.js           (Central state store)
│   ├── actions.js         (Action creators)
│   ├── selectors.js       (State selectors)
│   ├── *-reducer.js       (State reducers for each domain)
│   ├── *-middleware.js    (State middleware)
│   └── index.js           (State management exports)
├── utils/           (Helper functions)
│   ├── common.js      (General utility functions)
│   └── dom-utils.js   (DOM manipulation utilities)
├── popup/           (Browser action popup)
├── sidebar/         (Main sidebar functionality)
│   ├── sidebar.html       (Original sidebar interface)
│   ├── state-sidebar.html (State-managed sidebar interface)
│   └── js/
│       ├── modules/       (Original module implementations)
│       └── state/         (State-integrated UI managers)
│           ├── topic-manager.js      (Topic UI management)
│           ├── category-manager.js   (Category UI management)
│           ├── bookmark-manager.js   (Bookmark UI management)
│           └── tab-manager.js        (Browser tab management)
├── modals/          (Dialog windows)
│   ├── add-topic/     (Add topic modal)
│   └── category-sets/ (Category sets management)
└── index.js         (Central exports for easier imports)
```

## State Management System
The extension uses a centralized state management system inspired by Redux:

- **Store**: Central repository for all application state
- **Actions**: Standardized messages that describe state changes
- **Reducers**: Pure functions that calculate the next state
- **Selectors**: Functions to efficiently extract data from the state
- **Middleware**: Enhancers that add functionality like storage persistence and logging

### State Structure
```javascript
{
  version: 1,
  topics: [],               // All topics
  categories: {},           // Categories by topicId
  bookmarks: {},            // Bookmarks by categoryId
  categorySets: {},         // Reusable category templates
  activeTopicId: null,      // Currently selected topic
  uiState: {                // UI-specific state
    sidebarSections: {...}, // Open/closed sections
    selectedCategoryId: null,
    isLoading: false,
    errors: {}
  },
  meta: {                   // Metadata 
    lastUpdated: timestamp,
    initialized: boolean,
    lastChanged: string     // Tracks which slice was last changed
  }
}
```

## Service Layer
The extension implements a service layer that interfaces with the state system:

- **StorageService**: Acts as a legacy adapter for storage operations
- **TopicService**: Manages topic operations through state actions
- **CategoryService**: Handles category and category set operations
- **BookmarkService**: Manages bookmark operations with validation
- **ErrorService**: Provides centralized error handling and user notifications

## Data Models
Each entity has its own model with validation:

- **Topic**: `{ id, name, createdAt, updatedAt }`
- **Category**: `{ id, name, topicId, createdAt, updatedAt }`
- **Bookmark**: `{ id, title, url, categoryId, createdAt, updatedAt }`
- **CategorySet**: `{ id, name, categories, createdAt, updatedAt }`

## Tab Management
The extension includes a specialized system for tab management that integrates with the state system:

- **StateTabManager**: Manages browser tabs based on the active topic
- **Tab Visibility Control**: Shows/hides tabs based on topic association
- **Tab Assignment**: Associates tabs with specific topics
- **Default Tab Creation**: Creates a default tab for empty topics

Tab management works by:
1. Maintaining a mapping between tab IDs and topic IDs
2. Listening for browser tab events (create, remove, update)
3. Automatically assigning new tabs to the active topic
4. Using the Firefox `tabs.hide()` and `tabs.show()` APIs to control visibility
5. Responding to state changes, particularly to `activeTopicId`

Tab management functions are particularly important as they bridge between the state management system and browser-specific APIs, requiring careful handling of side effects outside the pure state flow.

## Error Handling
The extension implements a robust error handling system:

- **ErrorService**: Centralized service for handling, logging, and notifying
- **Error Types**: Specialized error classes for different error scenarios
- **User Notifications**: Visual feedback for errors and successful operations

## UI Components
The sidebar UI is available in two implementations:

### Legacy Sidebar (`sidebar.html`)
- Uses direct storage manipulation
- Module-based architecture

### State-Integrated Sidebar (`state-sidebar.html`)
- Uses state management system
- Component classes with store subscriptions
- Automatic UI updates in response to state changes

### UI Managers
State-integrated UI managers handle different aspects of the interface:

- **StateTopicManager**: Handles topic list and selection
- **StateCategoryManager**: Manages category creation and selection
- **StateBookmarkManager**: Controls bookmark operations and display
- **StateTabManager**: Controls browser tab visibility and topic assignment

## Messaging System
The extension uses a centralized messaging system:

- **MessageTypes**: Consistent message type definitions
- **createMessage()**: Creates properly formatted messages
- **sendMessage()**: Sends messages with error handling
- **isMessageType()**: Type checking for messages

## Data Flow (State-Based)

1. **User Interaction**: User performs an action in the UI
2. **Action Dispatch**: UI component dispatches an action to the store
3. **Middleware Processing**: Middleware like logging processes the action
4. **Reducer Application**: Appropriate reducer calculates the new state
5. **State Update**: Store updates its internal state
6. **Notification**: Store notifies all subscribers about the change
7. **UI Update**: UI components update based on new state
8. **Side Effects**: Tab management performs browser operations (show/hide tabs)
9. **Persistence**: Storage middleware persists changes to browser storage

### Example: Switching Topics

When a user selects a different topic:

```javascript
// 1. User clicks on a topic in the sidebar
topicItem.addEventListener('click', () => {
  // 2. Topic manager calls handleTopicSelect
  handleTopicSelect(topicId);
});

// 3. The handler dispatches an action to update active topic
store.dispatch(actions.setActiveTopic(topicId));

// 4. ActiveTopicId reducer updates the state
function activeTopicIdReducer(state, action) {
  if (action.type === ActionTypes.SET_ACTIVE_TOPIC) {
    return action.payload.topicId;
  }
  return state;
}

// 5. Store notifies all subscribers, including TabManager
// 6. TabManager detects the active topic change
handleStateChange(state) {
  if (state.activeTopicId && state.meta.lastChanged === 'activeTopicId') {
    this.handleTopicChange(state.activeTopicId);
  }
}

// 7. TabManager performs browser operations to show/hide tabs
async handleTopicChange(newTopicId) {
  // Hide tabs from other topics
  await browser.tabs.hide(tabsToHide);
  
  // Show tabs for the new topic
  await browser.tabs.show(tabsToShow);
}
```

## Extension Workflow
1. User opens the sidebar using the popup or keyboard shortcut (Ctrl+Shift+S)
2. User creates or selects a topic to work with
3. System automatically shows only tabs related to the selected topic and hides others
4. User can add bookmarks to categories within the active topic
5. User can create and manage category sets for easier topic setup
6. User can export/import their topics configuration

## Technical Implementation Notes
- Uses ES6 modules throughout
- Implements unidirectional data flow with state management
- Uses the Observer pattern for automatic UI updates
- Service classes abstract state management from UI
- Background page uses HTML wrapper to support ES6 modules
- Error handling provides both developer and user-friendly information
- Tab management integrates browser APIs with the state system
