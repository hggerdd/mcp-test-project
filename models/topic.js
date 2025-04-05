/**
 * Topic model definition.
 * Represents a collection of related tabs and bookmarks.
 */

/**
 * Create a new Topic object
 * 
 * @param {string} name - The name of the topic
 * @param {string} [id] - Optional ID (generated if not provided)
 * @returns {Object} A new Topic object
 */
export function createTopic(name, id = null) {
  return {
    id: id || 'topic_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: name,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Validate a topic object
 * 
 * @param {Object} topic - The topic object to validate
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
export function validateTopic(topic) {
  if (!topic) {
    throw new Error('Topic cannot be null or undefined');
  }
  
  if (!topic.id) {
    throw new Error('Topic must have an ID');
  }
  
  if (!topic.name || typeof topic.name !== 'string' || topic.name.trim() === '') {
    throw new Error('Topic must have a non-empty name');
  }
  
  return true;
}
