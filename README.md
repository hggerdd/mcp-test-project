# Simple Topics - Firefox Tab & Bookmark Manager

## Overview
A Firefox extension that helps users manage information overload by providing unified workspace switching. With a single action, users can switch between different contexts (topics) which automatically manages both visible tabs and available bookmarks. The system instantly hides irrelevant tabs and shows only topic-related bookmarks, creating focused workspaces. This unified approach eliminates the need to manually manage tabs and bookmark views separately.

Key Benefits:
- Single-action context switching (changes both visible tabs and bookmark views)
- Instant workspace transitions without manual reorganization
- Unified topic-based organization for tabs and bookmarks
- Reduce cognitive load by showing only relevant tabs
- Maintain separate workspaces for different projects/contexts
- Preserve browser memory by keeping inactive tabs loaded but hidden
- Quick context switching without manual tab organization
- Seamless integration with Firefox's native features

## Current Version
Version 2.0 (April 2025)

### Latest Improvements (April 2025)
- **Persistent Tab Management**: New robust tab identifier system ensures tabs maintain their topic assignments across browser restarts and page reloads
- **Fixed Default Tab Duplication**: Improved handling of default tabs to prevent duplication when switching topics
- **Tab State Preservation**: Enhanced tab state management preserves your workspaces even when Firefox is closed and reopened
- **State Management System**: Complete refactoring with central state management for consistent data handling and UI updates
- **Improved Error Handling**: Enhanced error recovery and user feedback mechanisms
- **Optimized Performance**: Better resource management for large numbers of tabs and topics

## Key Features

### Topic Workspaces
- One-click workspace switching affecting both tabs and bookmarks
- Universal topic switcher (Alt+T) for complete context changes
- Synchronized tab visibility and bookmark filtering
- Context-aware new tab and bookmark creation
- Smart workspace state preservation
- Topic templates for common workspace setups
- Topic sharing and import/export

### Tab Management
- Automatic tab assignment to active topic
- Manual tab topic reassignment
- Tab groups within topics
- Tab state preservation when hidden
- Tab search across all topics
- Tab statistics and usage metrics
- Auto-cleanup of stale tabs (configurable)
- Persistent tab identification across browser sessions

### Bookmark Organization
- Topic-specific bookmark categories
- Quick bookmark search within topics
- Bookmark tags and metadata
- Import from Firefox bookmarks
- Export to Firefox bookmarks
- Bookmark deduplication
- Broken link detection
- Bookmark suggestions based on usage

### Category Management
- Customizable category hierarchy per topic
- Category templates (category sets)
- Category sharing between topics
- Category statistics
- Auto-categorization suggestions
- Category merging and splitting
- Bulk category operations

### Data Management
- Cross-device synchronization
- Incremental state updates
- Conflict resolution
- Data compression
- Automatic backups
- Import/Export in multiple formats
- Data recovery tools
- Storage quota management

### User Interface
- Firefox sidebar integration (Ctrl+Shift+S)
- Topic switcher popup (Alt+T)
- Customizable keyboard shortcuts
- Dark/Light theme support
- Responsive design
- Touch-friendly controls
- Customizable view options
- Status indicators

## System Architecture
### Core Components
1. **State Management**
   - Central store following Redux patterns
   - Pure reducers for state updates
   - Action creators for state modifications
   - Selectors for efficient state querying
   - Middleware for side effects (storage, logging)
   - Automatic state persistence

2. **Data Models**
   - Topic: Base organizational unit containing categories
   - Category: Groups related bookmarks within a topic
   - Bookmark: Stores URL and metadata within categories
   - CategorySet: Template for quick category creation

3. **Service Layer**
   - StorageService: Browser storage abstraction
   - TopicService: Topic CRUD operations
   - CategoryService: Category management
   - BookmarkService: Bookmark operations
   - ErrorService: Error handling and notifications
   - TabIdentifier: Persistent tab identification system

4. **UI Management**
   - StateTopicManager: Topic list and selection
   - StateCategoryManager: Category operations
   - StateBookmarkManager: Bookmark handling
   - StateTabManager: Browser tab control

### State Structure
1. **Core Data**
   - topics: Array of topic objects
   - categories: Mapped by topicId
   - bookmarks: Mapped by categoryId
   - categorySets: Templates for category creation
   - activeTopicId: Currently selected topic

2. **UI State**
   - sidebarSections: Open/closed states
   - selectedCategoryId: Active category
   - isLoading: Loading indicators
   - errors: Error messages

3. **Metadata**
   - lastUpdated: Timestamp
   - initialized: Setup status
   - lastChanged: Change tracking

### Implementation Requirements
1. **Tab Management**
   - Maintain tab-to-topic mapping with persistent identifiers
   - Handle tab lifecycle events
   - Control tab visibility
   - Auto-assign new tabs
   - Handle browser restarts
   - Preserve tab assignments across sessions

2. **State Flow**
   - User action triggers
   - Action dispatch
   - Middleware processing
   - State calculation
   - UI updates
   - Side effect handling
   - State persistence

3. **Error Handling**
   - Error type classification
   - User-friendly messages
   - Error recovery flows
   - State consistency maintenance

4. **Browser Integration**
   - Firefox tabs API usage
   - Storage synchronization
   - Sidebar implementation
   - Extension lifecycle

### Development Guidelines
1. **Code Organization**
   - ES6 modules throughout
   - Clear separation of concerns
   - Pure functions for state updates
   - Isolated side effects
   - Type safety considerations

2. **State Management**
   - Immutable state updates
   - Action type constants
   - Selector memoization
   - State normalization
   - Update batching

3. **Error Prevention**
   - Data validation
   - Type checking
   - State consistency checks
   - API error handling
   - Recovery procedures

4. **Performance**
   - Efficient state updates
   - Minimal re-renders
   - Batch operations
   - Memory management
   - Storage optimization

## Extension Workflow
1. Sidebar activation
2. Topic selection/creation
3. Automatic tab management
4. Category organization
5. Bookmark management
6. Data persistence

## Technical Requirements
- Firefox browser
- ES6+ support
- Module support
- Storage APIs
- Tab manipulation APIs

## Implementation Notes
- Observer pattern for UI updates
- Proxy pattern for storage
- Command pattern for actions
- Factory pattern for entities
- Strategy pattern for error handling

## Program Structure Details

### Detailed Directory Structure
```
/
├── background/
│   ├── background.js           # Extension background script entry point
│   ├── background.html         # HTML wrapper for ES6 module support
│   └── messages.js             # Message handling between components
├── models/
│   ├── topic.js                # Topic model definition
│   ├── category.js             # Category model definition
│   └── bookmark.js             # Bookmark model definition
├── modals/
│   ├── add-topic/              # Topic creation modal
│   └── category-sets/          # Category templates modal
├── popup/
│   ├── popup.html              # Extension popup
│   └── popup.js                # Popup functionality
├── services/
│   ├── error/                  # Error handling services
│   ├── storage-service.js      # Storage abstraction
│   ├── topic-service.js        # Topic operations
│   ├── category-service.js     # Category operations
│   └── bookmark-service.js     # Bookmark operations
├── sidebar/
│   ├── js/                     # Sidebar JavaScript
│   ├── sidebar.css             # Sidebar styling
│   └── state-sidebar.html      # Main sidebar UI
├── state/
│   ├── reducers/               # State reducers
│   ├── actions.js              # Action creators
│   ├── store.js                # Central state store
│   └── selectors.js            # State query functions
└── utils/
    ├── common.js               # Shared utilities
    ├── dom-utils.js            # DOM manipulation helpers
    └── tab-identifier.js       # Persistent tab identification
```

### Key Class Relationships

1. **Store Integration**
```
Store <── StateAwareComponent
     └── ServiceBase
          ├── TopicService
          ├── CategoryService
          └── BookmarkService
```

2. **UI Component Hierarchy**
```
Component
├── StateAwareComponent
│   ├── TopicList
│   ├── CategoryList
│   └── BookmarkList
└── ModalComponent
    ├── AddTopicModal
    └── CategorySetModal
```

3. **Service Dependencies**
```
ServiceBase
├── StorageService
│   └── browser.storage
├── ErrorService
│   └── NotificationManager
└── TabService
    └── browser.tabs
```

### State Update Sequence

1. **User Action Flow**
```
UI Event → Action Creator → Middleware → Reducer → State Update → UI Update
```

2. **Background Process Flow**
```
Browser Event → Message Handler → Service → Store → State Update → UI Update
```

3. **Storage Sync Flow**
```
State Update → Storage Middleware → Storage Service → Browser Storage → Sync Event
```

## Bookmark Management

### Bookmark Structure
1. **Bookmark Model**
   - id: Unique identifier
   - title: Display name
   - url: Target URL
   - categoryId: Parent category
   - metadata: Additional data
   - createdAt/updatedAt: Timestamps

2. **Organization**
   - Hierarchical: Topic → Category → Bookmark
   - Multiple bookmarks per category
   - Cross-category search
   - Duplicate detection

3. **Operations**
   - Create: Add new bookmarks
   - Update: Modify existing bookmarks
   - Delete: Remove bookmarks
   - Move: Change category
   - Import: From browser bookmarks
   - Export: To browser bookmarks

### Data Persistence

1. **Storage Architecture**
   - Browser storage.sync for cross-device sync
   - Browser storage.local for large data
   - IndexedDB for backup/restore
   - File system for import/export

2. **Data Format**
```typescript
interface StorageData {
  version: number;
  topics: {
    [id: string]: Topic;
  };
  categories: {
    [id: string]: Category;
  };
  bookmarks: {
    [id: string]: Bookmark;
  };
  categorySets: {
    [id: string]: CategorySet;
  };
  metadata: {
    lastSync: number;
    deviceId: string;
    settings: UserSettings;
  };
}
```

## Persistence Flow

1. **Save Operations**
```
State Change → Storage Middleware → Chunking → Storage Service → Browser Storage
```

2. **Load Operations**
```
Browser Start → Storage Service → Data Assembly → State Hydration → UI Update
```

3. **Sync Operations**
```
Storage Change → Sync Detection → Conflict Resolution → State Update → UI Refresh
```

4. **Import/Export**
```
File Selection → Parse/Format → Validation → Storage Update → State Sync
```

## Error Handling

1. **Storage Failures**
   - Retry mechanisms
   - Fallback storage
   - Data reconstruction
   - User notifications

2. **Sync Conflicts**
   - Last-write-wins
   - Manual resolution
   - Merge strategies
   - Version tracking

3. **Quota Management**
   - Size monitoring
   - Auto-cleanup
   - Priority-based retention
   - User warnings

## Future Development

1. **Phase 3: Performance & Extensibility**
   - Code-splitting for better startup times
   - Advanced caching strategies
   - Enhanced search and filter functions
   - Comprehensive testing suite
   - Complete API documentation

2. **Future Roadmap**
   - Cross-browser synchronization
   - Advanced tagging system
   - Offline support
   - Usage statistics and analytics
   - AI-assisted organization
