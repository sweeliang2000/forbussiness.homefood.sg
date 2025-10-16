/**
 * Utility functions for managing subscription lookup key in localStorage
 */

const SUBSCRIPTION_LOOKUP_KEY = 'subscription_lookup_key';

/**
 * Get the subscription lookup key from localStorage
 * @returns {string|null} The lookup key if found, null otherwise
 */
export const getSubscriptionLookupKey = () => {
  try {
    const lookupKey = localStorage.getItem(SUBSCRIPTION_LOOKUP_KEY);
    return lookupKey;
  } catch (error) {
    console.error('[SUBSCRIPTION STORAGE] Failed to get lookup key from localStorage:', error);
    return null;
  }
};

/**
 * Set the subscription lookup key in localStorage
 * @param {string} lookupKey - The lookup key to store
 * @returns {boolean} True if successful, false otherwise
 */
export const setSubscriptionLookupKey = (lookupKey) => {
  try {
    localStorage.setItem(SUBSCRIPTION_LOOKUP_KEY, lookupKey);
    console.log('[SUBSCRIPTION STORAGE] Stored lookup key in localStorage:', lookupKey);
    return true;
  } catch (error) {
    console.error('[SUBSCRIPTION STORAGE] Failed to store lookup key in localStorage:', error);
    return false;
  }
};

/**
 * Remove the subscription lookup key from localStorage
 * @returns {boolean} True if successful, false otherwise
 */
export const removeSubscriptionLookupKey = () => {
  try {
    localStorage.removeItem(SUBSCRIPTION_LOOKUP_KEY);
    console.log('[SUBSCRIPTION STORAGE] Removed lookup key from localStorage');
    return true;
  } catch (error) {
    console.error('[SUBSCRIPTION STORAGE] Failed to remove lookup key from localStorage:', error);
    return false;
  }
};

/**
 * Check if subscription lookup key exists in localStorage
 * @returns {boolean} True if exists, false otherwise
 */
export const hasSubscriptionLookupKey = () => {
  try {
    return localStorage.getItem(SUBSCRIPTION_LOOKUP_KEY) !== null;
  } catch (error) {
    console.error('[SUBSCRIPTION STORAGE] Failed to check lookup key existence:', error);
    return false;
  }
};
