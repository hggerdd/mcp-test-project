/**
 * Category model definition.
 * Represents a group of bookmarks within a topic.
 */

/**
 * Create a new Category object
 * 
 * @param {string} name - The name of the category
 * @param {string} topicId - The ID of the topic this category belongs to
 * @param {string} [id] - Optional ID (generated if not provided)
 * @returns {Object} A new Category object
 */
export function createCategory(name, topicId, id = null) {
  return {
    id: id || 'category_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: name,
    topicId: topicId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Validate a category object
 * 
 * @param {Object} category - The category object to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validateCategory(category) {
  if (!category) {
    throw new Error('Category cannot be null or undefined');
  }
  
  if (!category.id) {
    throw new Error('Category must have an ID');
  }
  
  if (!category.name || typeof category.name !== 'string' || category.name.trim() === '') {
    throw new Error('Category must have a non-empty name');
  }
  
  if (!category.topicId) {
    throw new Error('Category must be associated with a topic');
  }
  
  return true;
}

/**
 * Create a category set
 * 
 * @param {string} name - The name of the category set
 * @param {Array<string>} categories - List of category names
 * @param {string} [id] - Optional ID (generated if not provided)
 * @returns {Object} A new category set object
 */
export function createCategorySet(name, categories = [], id = null) {
  return {
    id: id || name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    name: name,
    categories: categories,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
