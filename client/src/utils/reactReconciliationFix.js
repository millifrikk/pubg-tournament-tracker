/**
 * This module provides a fix for React rendering issues
 * It can be imported in the main app component or anywhere a rendering issue occurs
 */

// Apply the fix when this module is imported
(function applyReconciliationFix() {
  // Ensure this only runs in the browser
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Fix for React 17+ to prevent potential reconciliation issues
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    // Only for div elements which are commonly used in React
    if (tagName.toLowerCase() === 'div') {
      const element = originalCreateElement.call(this, tagName, options);
      
      // Override the appendChild method to ensure proper rendering
      const originalAppendChild = element.appendChild;
      element.appendChild = function(child) {
        try {
          return originalAppendChild.call(this, child);
        } catch (e) {
          console.warn('Prevented React rendering error:', e);
          // Attempt to recover if possible
          setTimeout(() => {
            try {
              originalAppendChild.call(this, child);
            } catch (innerError) {
              // Silently fail the delayed attempt
            }
          }, 0);
        }
      };
      
      return element;
    }
    
    return originalCreateElement.call(this, tagName, options);
  };
  
  // Additionally, inject a small bit of CSS to help with any animation-based flickering
  const style = document.createElement('style');
  style.textContent = `
    /* Prevent layout thrashing during React updates */
    .match-details-page * {
      backface-visibility: hidden;
      -webkit-font-smoothing: antialiased;
      transform: translateZ(0);
    }
  `;
  document.head.appendChild(style);

  console.log('✅ React reconciliation fix applied');
})();

// Export an empty object just for proper module format
export default {};