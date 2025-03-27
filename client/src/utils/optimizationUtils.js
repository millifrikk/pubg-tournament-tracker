/**
 * Utility functions for performance optimization
 */

/**
 * Debounces a function to limit how often it can be called
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} A debounced version of the function
 */
export const debounce = (func, wait) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Creates a memoized version of a function that only recalculates
 * when one of the dependencies changes
 * 
 * @param {Function} fn - The function to memoize
 * @param {Array} deps - The dependencies to watch
 * @returns {any} The memoized result
 */
export const memoize = (fn, deps = []) => {
  const cache = {
    deps: null,
    result: null
  };
  
  return (...args) => {
    // If this is the first call or deps have changed
    const depsChanged = !cache.deps || 
      deps.some((dep, i) => dep !== cache.deps[i]);
      
    if (depsChanged) {
      // Update cache
      cache.deps = deps;
      cache.result = fn(...args);
    }
    
    return cache.result;
  };
};

/**
 * A hook version of memoize for use in components
 * 
 * @param {Function} fn - The function to memoize
 * @param {Array} deps - The dependencies to watch
 * @returns {any} The memoized result
 */
export const useMemoized = (fn, deps = []) => {
  const ref = React.useRef({
    deps: null,
    result: null,
    initialized: false
  });
  
  if (!ref.current.initialized || 
      !ref.current.deps || 
      deps.some((dep, i) => dep !== ref.current.deps[i])) {
    ref.current.deps = deps;
    ref.current.result = fn();
    ref.current.initialized = true;
  }
  
  return ref.current.result;
};

/**
 * Force the browser to perform a repaint
 * Can help with visual glitches
 */
export const forceRepaint = () => {
  // Reading a property that requires layout calculation
  // forces a synchronous layout
  const _ = document.body.offsetHeight;
};

export default {
  debounce,
  memoize,
  useMemoized,
  forceRepaint
};