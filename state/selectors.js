/**
 * Selectors for the state store.
 * 
 * These functions help extract and compute data from the state in an efficient way.
 */

/**
 * Get a topic by ID
 * 
 * @param {object} state - Store state
 * @param {string} topicId - Topic ID
 * @returns {object|null} Topic object or null
 */
export function selectTopicById(state, topicId) {
  return state.topics.find(topic => topic.id === topicId) || null;
}

/**
 * Get the active topic
 * 
 * @param {object} state - Store state
 * @returns {object|null} Active topic or null
 */
export function selectActiveTopic(state) {
  if (!state.activeTopicId) return null;
  return selectTopicById(state, state.activeTopicId);
}

/**
 * Get all categories for a topic
 * 
 * @param {object} state - Store state
 * @param {string} topicId - Topic ID
 * @returns {Array} List of categories
 */
export function selectCategoriesByTopicId(state, topicId) {
  return state.categories[topicId] || [];
}

/**
 * Get a category by ID
 * 
 * @param {object} state - Store state
 * @param {string} topicId - Topic ID
 * @param {string} categoryId - Category ID
 * @returns {object|null} Category object or null
 */
export function selectCategoryById(state, topicId, categoryId) {
  const categories = selectCategoriesByTopicId(state, topicId);
  return categories.find(category => category.id === categoryId) || null;
}

/**
 * Get all bookmarks for a category
 * 
 * @param {object} state - Store state
 * @param {string} categoryId - Category ID
 * @returns {Array} List of bookmarks
 */
export function selectBookmarksByCategoryId(state, categoryId) {
  return state.bookmarks[categoryId] || [];
}

/**
 * Get a bookmark by ID
 * 
 * @param {object} state - Store state
 * @param {string} categoryId - Category ID
 * @param {string} bookmarkId - Bookmark ID
 * @returns {object|null} Bookmark object or null
 */
export function selectBookmarkById(state, categoryId, bookmarkId) {
  const bookmarks = selectBookmarksByCategoryId(state, categoryId);
  return bookmarks.find(bookmark => bookmark.id === bookmarkId) || null;
}

/**
 * Get a category set by ID
 * 
 * @param {object} state - Store state
 * @param {string} categorySetId - Category set ID
 * @returns {object|null} Category set object or null
 */
export function selectCategorySetById(state, categorySetId) {
  return state.categorySets[categorySetId] || null;
}

/**
 * Get all bookmarks for a topic (across all categories)
 * 
 * @param {object} state - Store state
 * @param {string} topicId - Topic ID
 * @returns {Array} List of bookmarks with category information
 */
export function selectAllBookmarksForTopic(state, topicId) {
  const categories = selectCategoriesByTopicId(state, topicId);
  const result = [];
  
  for (const category of categories) {
    const bookmarks = selectBookmarksByCategoryId(state, category.id);
    bookmarks.forEach(bookmark => {
      result.push({
        ...bookmark,
        categoryName: category.name
      });
    });
  }
  
  return result;
}

/**
 * Search bookmarks across all topics or a specific topic
 * 
 * @param {object} state - Store state
 * @param {string} query - Search query
 * @param {string} [topicId] - Optional topic ID to limit search
 * @returns {Array} List of matching bookmarks with topic and category information
 */
export function searchBookmarks(state, query, topicId = null) {
  const normalizedQuery = query.toLowerCase().trim();
  const result = [];
  
  // If no query, return empty results
  if (!normalizedQuery) return result;
  
  // Filter topics if topicId is provided
  const topics = topicId 
    ? state.topics.filter(topic => topic.id === topicId) 
    : state.topics;
  
  // Search through all topics
  for (const topic of topics) {
    const categories = selectCategoriesByTopicId(state, topic.id);
    
    // Search through categories in this topic
    for (const category of categories) {
      const bookmarks = selectBookmarksByCategoryId(state, category.id);
      
      // Find matching bookmarks
      const matchingBookmarks = bookmarks.filter(bookmark => {
        const titleMatch = bookmark.title && bookmark.title.toLowerCase().includes(normalizedQuery);
        const urlMatch = bookmark.url && bookmark.url.toLowerCase().includes(normalizedQuery);
        return titleMatch || urlMatch;
      });
      
      // Add to results with context
      matchingBookmarks.forEach(bookmark => {
        result.push({
          ...bookmark,
          topicId: topic.id,
          topicName: topic.name,
          categoryId: category.id,
          categoryName: category.name
        });
      });
    }
  }
  
  return result;
}

export default {
  selectTopicById,
  selectActiveTopic,
  selectCategoriesByTopicId,
  selectCategoryById,
  selectBookmarksByCategoryId,
  selectBookmarkById,
  selectCategorySetById,
  selectAllBookmarksForTopic,
  searchBookmarks
};
