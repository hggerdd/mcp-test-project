/**
 * Tab Identifier
 * 
 * Provides stable identification for tabs that persists across browser restarts
 * and page reloads by combining URL patterns, favicon, and DOM fingerprinting.
 */

/**
 * TabIdentifier class
 * Generates and manages stable identifiers for browser tabs
 */
export class TabIdentifier {
  constructor() {
    this.tabIdToStableIdMap = new Map(); // Maps Firefox tab IDs to stable IDs
    this.stableIdToTabIdMap = new Map(); // Maps stable IDs to Firefox tab IDs
    this.metadataCache = new Map(); // Caches tab metadata for optimization
  }

  /**
   * Generate a stable tab ID based on URL, favicon, and DOM elements
   * 
   * @param {Object} tab - Firefox tab object
   * @returns {Promise<string>} - Stable tab ID
   */
  async getStableTabId(tab) {
    if (!tab) return null;

    // Check if we already have a stable ID for this tab
    if (this.tabIdToStableIdMap.has(tab.id)) {
      return this.tabIdToStableIdMap.get(tab.id);
    }

    try {
      // Get core tab metadata
      const metadata = await this.getTabMetadata(tab);
      
      // Generate a stable ID using the metadata
      const stableId = this.generateStableId(metadata);
      
      // Map the Firefox tab ID to the stable ID
      this.updateMappings(tab.id, stableId);
      
      return stableId;
    } catch (error) {
      console.error(`[TabIdentifier] Error generating stable ID:`, error);
      // Fallback - use URL with some normalization
      const fallbackId = this.generateFallbackId(tab.url);
      this.updateMappings(tab.id, fallbackId);
      return fallbackId;
    }
  }

  /**
   * Get tab metadata for identification
   * 
   * @param {Object} tab - Firefox tab object
   * @returns {Promise<Object>} - Tab metadata
   */
  async getTabMetadata(tab) {
    // Check cache first
    if (this.metadataCache.has(tab.id)) {
      return this.metadataCache.get(tab.id);
    }

    try {
      const metadata = {
        urlPattern: this.getNormalizedUrlPattern(tab.url),
        domain: this.extractDomain(tab.url),
        title: tab.title || '',
        faviconUrl: tab.favIconUrl || '',
        domFingerprint: await this.extractDomFingerprint(tab)
      };

      // Cache the metadata
      this.metadataCache.set(tab.id, metadata);
      
      return metadata;
    } catch (error) {
      console.error(`[TabIdentifier] Error getting tab metadata for tab ${tab.id}:`, error);
      
      // Create a basic metadata object that doesn't rely on DOM fingerprinting
      const fallbackMetadata = {
        urlPattern: this.getNormalizedUrlPattern(tab.url),
        domain: this.extractDomain(tab.url),
        title: tab.title || '',
        faviconUrl: tab.favIconUrl || '',
        domFingerprint: this.hashString(`fallback-fingerprint|${tab.url}|${tab.title}`)
      };
      
      // Cache the fallback metadata
      this.metadataCache.set(tab.id, fallbackMetadata);
      
      return fallbackMetadata;
    }
  }

  /**
   * Generate a stable ID from tab metadata
   * 
   * @param {Object} metadata - Tab metadata
   * @returns {string} - Stable ID
   */
  generateStableId(metadata) {
    // Primary identification is based on URL pattern
    let baseId = metadata.urlPattern;
    
    // Add domain for extra stability
    baseId += `|${metadata.domain}`;
    
    // Add DOM fingerprint if available
    if (metadata.domFingerprint) {
      baseId += `|${metadata.domFingerprint}`;
    }
    
    // Add favicon hash if available
    if (metadata.faviconUrl) {
      const faviconHash = this.hashString(metadata.faviconUrl).slice(0, 8);
      baseId += `|${faviconHash}`;
    }
    
    // Create a hash of the combination
    return this.hashString(baseId);
  }

  /**
   * Generate a fallback ID based on URL
   * 
   * @param {string} url - Tab URL
   * @returns {string} - Fallback ID
   */
  generateFallbackId(url) {
    const normalizedUrl = this.getNormalizedUrlPattern(url);
    const domain = this.extractDomain(url);
    return this.hashString(`fallback|${normalizedUrl}|${domain}`);
  }

  /**
   * Get current Firefox tab ID from stable ID
   * 
   * @param {string} stableId - Stable tab ID
   * @returns {number|null} - Firefox tab ID or null if not found
   */
  getTabIdFromStableId(stableId) {
    return this.stableIdToTabIdMap.get(stableId) || null;
  }

  /**
   * Update the ID mappings
   * 
   * @param {number} tabId - Firefox tab ID
   * @param {string} stableId - Stable tab ID
   */
  updateMappings(tabId, stableId) {
    // Remove any existing mappings for this tab ID
    const oldStableId = this.tabIdToStableIdMap.get(tabId);
    if (oldStableId) {
      this.stableIdToTabIdMap.delete(oldStableId);
    }
    
    // Remove any existing mappings for this stable ID
    const oldTabId = this.stableIdToTabIdMap.get(stableId);
    if (oldTabId) {
      this.tabIdToStableIdMap.delete(oldTabId);
    }
    
    // Add new mappings
    this.tabIdToStableIdMap.set(tabId, stableId);
    this.stableIdToTabIdMap.set(stableId, tabId);
  }

  /**
   * Clear mappings for a tab ID
   * 
   * @param {number} tabId - Firefox tab ID
   */
  clearTabMapping(tabId) {
    const stableId = this.tabIdToStableIdMap.get(tabId);
    if (stableId) {
      this.stableIdToTabIdMap.delete(stableId);
      this.tabIdToStableIdMap.delete(tabId);
    }
    
    // Clear metadata cache
    this.metadataCache.delete(tabId);
  }

  /**
   * Get normalized URL pattern by removing variable parts
   * 
   * @param {string} url - Original URL
   * @returns {string} - Normalized URL pattern
   */
  getNormalizedUrlPattern(url) {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      
      // Handle topicId hash specially to ensure unique default tabs
      // If URL has our special topicId hash, include it in the pattern
      if (urlObj.hash && urlObj.hash.includes('topicId=')) {
        // This is a default tab we created with a specific topic ID
        // Return the full URL with hash to ensure unique identification
        return url;
      }
      
      // Keep the protocol, hostname, and path structure
      let normalizedUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
      
      // Remove trailing slashes
      normalizedUrl = normalizedUrl.replace(/\/+$/, '');
      
      // Include stable query parameters if present
      if (urlObj.search) {
        // Filter out session-based or tracking parameters
        const searchParams = new URLSearchParams(urlObj.search);
        const stableParams = new URLSearchParams();
        
        // Keep only stable parameters (customize this list as needed)
        const unstableParamPrefixes = ['utm_', 'ref', 'session', 'token', 'id', 'fbclid', 'gclid'];
        
        for (const [key, value] of searchParams.entries()) {
          const isUnstable = unstableParamPrefixes.some(prefix => 
            key.toLowerCase().startsWith(prefix.toLowerCase())
          );
          
          if (!isUnstable) {
            stableParams.append(key, value);
          }
        }
        
        // Sort parameters for consistency
        const sortedParams = Array.from(stableParams.entries())
          .sort((a, b) => a[0].localeCompare(b[0]));
        
        const newSearchParams = new URLSearchParams();
        for (const [key, value] of sortedParams) {
          newSearchParams.append(key, value);
        }
        
        const paramString = newSearchParams.toString();
        if (paramString) {
          normalizedUrl += `?${paramString}`;
        }
      }
      
      return normalizedUrl;
    } catch (error) {
      console.warn(`[TabIdentifier] Error normalizing URL ${url}:`, error);
      return url; // Return original URL if parsing fails
    }
  }

  /**
   * Extract domain from URL
   * 
   * @param {string} url - URL
   * @returns {string} - Domain
   */
  extractDomain(url) {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract DOM fingerprint from a tab
   * 
   * @param {Object} tab - Firefox tab object
   * @returns {Promise<string>} - DOM fingerprint
   */
  async extractDomFingerprint(tab) {
    try {
      // Check if the tab's URL is accessible to content scripts
      if (!tab.url || tab.url.startsWith('about:') || 
          tab.url.startsWith('moz-extension:') || 
          tab.url.startsWith('chrome:') || 
          tab.url.startsWith('resource:') ||
          tab.url.startsWith('file:') ||
          tab.url.startsWith('view-source:')) {
        // These are restricted URLs, don't try to execute script
        return this.hashString(tab.url + '|' + tab.title);
      }
      
      // Execute script in the tab to get DOM structure
      const result = await browser.tabs.executeScript(tab.id, {
        code: `
          (function() {
            try {
              // Get key DOM elements that identify the page structure
              const fingerprint = {
                // Page title
                title: document.title,
                
                // Meta tags (description, keywords)
                meta: Array.from(document.querySelectorAll('meta[name="description"], meta[name="keywords"]'))
                  .map(el => ({ name: el.getAttribute('name'), content: el.getAttribute('content') })),
                
                // Main heading structure
                headings: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
                
                // Main structural elements
                mainStructure: [
                  // Count main structural elements
                  document.querySelectorAll('header').length,
                  document.querySelectorAll('footer').length,
                  document.querySelectorAll('nav').length, 
                  document.querySelectorAll('main').length,
                  document.querySelectorAll('article').length
                ],
                
                // Page-specific identifiers (common IDs)
                pageIds: Array.from(document.querySelectorAll('[id="content"], [id="main"], [id="app"], [id="root"]'))
                  .map(el => el.id)
              };
              
              return JSON.stringify(fingerprint);
            } catch (err) {
              return JSON.stringify({ error: err.message, title: document.title });
            }
          })();
        `
      });
      
      if (result && result[0]) {
        // Hash the fingerprint for consistency
        return this.hashString(result[0]);
      }
    } catch (error) {
      // For permission errors, use a fallback identifier based on tab properties
      if (error.message && error.message.includes("Missing host permission")) {
        console.warn(`[TabIdentifier] Permission issue for tab ${tab.id}. Using fallback identification.`);
        return this.hashString(`restricted-tab|${tab.url}|${tab.title}`);
      }
      
      // For other errors, just log and continue
      console.debug(`[TabIdentifier] Could not extract DOM fingerprint for tab ${tab.id}:`, error);
    }
    
    // Create a basic fingerprint from URL and title
    return this.hashString(`basic|${tab.url}|${tab.title}`);
  }

  /**
   * Create a hash from a string
   * 
   * @param {string} str - Input string
   * @returns {string} - Hash string
   */
  hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString(16);
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to hex string
    const hashHex = (hash >>> 0).toString(16);
    return hashHex.padStart(8, '0');
  }

  /**
   * Check if a tab has changed significantly (requiring a new stable ID)
   * 
   * @param {Object} tab - Firefox tab object
   * @returns {Promise<boolean>} - True if tab changed significantly
   */
  async hasTabChangedSignificantly(tab) {
    const oldMetadata = this.metadataCache.get(tab.id);
    if (!oldMetadata) return true;
    
    const newMetadata = await this.getTabMetadata(tab);
    
    // Compare URL pattern - most important factor
    if (oldMetadata.urlPattern !== newMetadata.urlPattern) {
      return true;
    }
    
    // Compare domain - indicates a site change
    if (oldMetadata.domain !== newMetadata.domain) {
      return true;
    }
    
    return false;
  }

  /**
   * Update stable ID for a tab if necessary
   * 
   * @param {Object} tab - Firefox tab object
   * @returns {Promise<string>} - Updated stable ID
   */
  async updateStableId(tab) {
    const hasChanged = await this.hasTabChangedSignificantly(tab);
    
    if (hasChanged) {
      // Clear existing metadata and mapping
      this.clearTabMapping(tab.id);
      
      // Generate new stable ID
      return this.getStableTabId(tab);
    }
    
    // Return existing stable ID
    return this.tabIdToStableIdMap.get(tab.id);
  }
}

export default TabIdentifier;
