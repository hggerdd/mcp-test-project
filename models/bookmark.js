/**
 * Bookmark model definition.
 * Represents a saved URL within a category.
 */

/**
 * Create a new Bookmark object
 * 
 * @param {string} title - The title of the bookmark
 * @param {string} url - The URL of the bookmark
 * @param {string} categoryId - The ID of the category this bookmark belongs to
 * @param {string} [id] - Optional ID (generated if not provided)
 * @returns {Object} A new Bookmark object
 */
export function createBookmark(title, url, categoryId, id = null) {
  return {
    id: id || 'bookmark_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    title: title,
    url: url,
    categoryId: categoryId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Validate a bookmark object
 * 
 * @param {Object} bookmark - The bookmark object to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validateBookmark(bookmark) {
  if (!bookmark) {
    throw new Error('Bookmark cannot be null or undefined');
  }
  
  if (!bookmark.id) {
    throw new Error('Bookmark must have an ID');
  }
  
  if (!bookmark.title || typeof bookmark.title !== 'string' || bookmark.title.trim() === '') {
    throw new Error('Bookmark must have a non-empty title');
  }
  
  if (!bookmark.url || typeof bookmark.url !== 'string' || bookmark.url.trim() === '') {
    throw new Error('Bookmark must have a non-empty URL');
  }
  
  try {
    // Basic URL validation
    new URL(bookmark.url);
  } catch (error) {
    throw new Error('Bookmark URL is not valid');
  }
  
  if (!bookmark.categoryId) {
    throw new Error('Bookmark must be associated with a category');
  }
  
  return true;
}

/**
 * Create a bookmark from a browser tab
 * 
 * @param {Object} tab - Browser tab object
 * @param {string} categoryId - Category ID to associate with
 * @returns {Object} A new Bookmark object
 */
export function createBookmarkFromTab(tab, categoryId) {
  return createBookmark(tab.title, tab.url, categoryId);
}
