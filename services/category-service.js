/**
 * Category Service using the state management system.
 * 
 * Provides methods for working with categories and category sets.
 */

import { store, actions, selectors } from '../state/index.js';
import { validateCategory } from '../models/category.js';

export class CategoryService {
  /**
   * Get all categories for a topic
   * 
   * @param {string} topicId - Topic ID
   * @returns {Array} Array of category objects
   */
  getCategories(topicId) {
    return selectors.selectCategoriesByTopicId(store.getState(), topicId);
  }
  
  /**
   * Get a specific category by ID
   * 
   * @param {string} topicId - Topic ID
   * @param {string} categoryId - Category ID
   * @returns {Object|null} Category object or null if not found
   */
  getCategoryById(topicId, categoryId) {
    return selectors.selectCategoryById(store.getState(), topicId, categoryId);
  }
  
  /**
   * Create a new category
   * 
   * @param {string} name - Category name
   * @param {string} topicId - Topic ID
   * @returns {Object} The created category
   */
  async createCategory(name, topicId) {
    // Add the category to the store
    store.dispatch(actions.addCategory(name, topicId));
    
    // Get the newly created category
    const categories = this.getCategories(topicId);
    return categories[categories.length - 1];
  }
  
  /**
   * Update an existing category
   * 
   * @param {string} topicId - Topic ID
   * @param {string} categoryId - Category ID to update
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated category or null if not found
   */
  async updateCategory(topicId, categoryId, updates) {
    // Ensure category exists
    const category = this.getCategoryById(topicId, categoryId);
    if (!category) {
      return null;
    }
    
    // Update the category
    store.dispatch(actions.updateCategory(categoryId, topicId, updates));
    
    // Return the updated category
    return this.getCategoryById(topicId, categoryId);
  }
  
  /**
   * Delete a category
   * 
   * @param {string} topicId - Topic ID
   * @param {string} categoryId - Category ID to delete
   * @returns {boolean} Success status
   */
  async deleteCategory(topicId, categoryId) {
    // Ensure category exists
    const category = this.getCategoryById(topicId, categoryId);
    if (!category) {
      return false;
    }
    
    // Delete the category (also handles related bookmarks via reducers)
    store.dispatch(actions.deleteCategory(categoryId, topicId));
    
    return true;
  }
  
  /**
   * Add categories from a category set to a topic
   * 
   * @param {string} topicId - Topic ID
   * @param {string} categorySetId - Category set ID to use
   * @returns {Array} Added categories
   */
  async addCategoriesFromSet(topicId, categorySetId) {
    // Get category set
    const categorySet = this.getCategorySetById(categorySetId);
    if (!categorySet) {
      throw new Error('Category set not found');
    }
    
    const addedCategories = [];
    
    // Add each category from the set
    for (const categoryName of categorySet.categories) {
      // Add the category
      store.dispatch(actions.addCategory(categoryName, topicId));
      
      // Get the newly created category
      const categories = this.getCategories(topicId);
      addedCategories.push(categories[categories.length - 1]);
    }
    
    return addedCategories;
  }
  
  /**
   * Get all category sets
   * 
   * @returns {Object} Object containing category sets
   */
  async getCategorySets() {
    return store.getState().categorySets;
  }
  
  /**
   * Get a category set by ID
   * 
   * @param {string} categorySetId - Category set ID
   * @returns {Object|null} Category set object or null if not found
   */
  getCategorySetById(categorySetId) {
    return selectors.selectCategorySetById(store.getState(), categorySetId);
  }
  
  /**
   * Create a new category set
   * 
   * @param {string} name - Name of the set
   * @param {Array<string>} categories - List of category names
   * @returns {Object} The created category set
   */
  async createCategorySet(name, categories = []) {
    // Add the category set to the store
    store.dispatch(actions.addCategorySet(name, categories));
    
    // Return the newly created category set
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return this.getCategorySetById(id);
  }
  
  /**
   * Update an existing category set
   * 
   * @param {string} categorySetId - Category set ID
   * @param {Object} updates - Properties to update
   * @returns {Object|null} Updated set or null if not found
   */
  async updateCategorySet(categorySetId, updates) {
    // Ensure category set exists
    const categorySet = this.getCategorySetById(categorySetId);
    if (!categorySet) {
      return null;
    }
    
    // Update the category set
    store.dispatch(actions.updateCategorySet(categorySetId, updates));
    
    // Return the updated category set
    return this.getCategorySetById(categorySetId);
  }
  
  /**
   * Delete a category set
   * 
   * @param {string} categorySetId - Category set ID to delete
   * @returns {boolean} Success status
   */
  async deleteCategorySet(categorySetId) {
    // Ensure category set exists
    const categorySet = this.getCategorySetById(categorySetId);
    if (!categorySet) {
      return false;
    }
    
    // Delete the category set
    store.dispatch(actions.deleteCategorySet(categorySetId));
    
    return true;
  }
  
  /**
   * Add a category to a category set
   * 
   * @param {string} categorySetId - Category set ID
   * @param {string} categoryName - Category name to add
   * @returns {Object} Updated category set
   */
  async addCategoryToSet(categorySetId, categoryName) {
    // Get the current category set
    const categorySet = this.getCategorySetById(categorySetId);
    if (!categorySet) {
      throw new Error('Category set not found');
    }
    
    // Add the category to the set
    const updatedCategories = [...categorySet.categories, categoryName];
    store.dispatch(actions.updateCategorySet(categorySetId, { 
      categories: updatedCategories 
    }));
    
    // Return the updated category set
    return this.getCategorySetById(categorySetId);
  }
  
  /**
   * Remove a category from a category set
   * 
   * @param {string} categorySetId - Category set ID
   * @param {number} categoryIndex - Index of category to remove
   * @returns {Object} Updated category set
   */
  async removeCategoryFromSet(categorySetId, categoryIndex) {
    // Get the current category set
    const categorySet = this.getCategorySetById(categorySetId);
    if (!categorySet) {
      throw new Error('Category set not found');
    }
    
    if (categoryIndex < 0 || categoryIndex >= categorySet.categories.length) {
      throw new Error('Invalid category index');
    }
    
    // Remove the category from the set
    const updatedCategories = [...categorySet.categories];
    updatedCategories.splice(categoryIndex, 1);
    
    store.dispatch(actions.updateCategorySet(categorySetId, { 
      categories: updatedCategories 
    }));
    
    // Return the updated category set
    return this.getCategorySetById(categorySetId);
  }
  
  /**
   * Update all category sets
   * 
   * @param {Object} categorySets - New category sets object
   * @returns {Promise<void>}
   */
  async updateCategorySets(categorySets) {
    store.dispatch(actions.setCategorySets({ categorySets }));
  }
}

export default CategoryService;
