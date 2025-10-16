/**
 * Utility functions for parsing and managing cookies
 */

/**
 * Parse a cookie string and return an object with key-value pairs
 * @param {string} cookieString - The cookie string to parse
 * @returns {Object} Object containing cookie key-value pairs
 */
export const parseCookies = (cookieString) => {
  const cookies = {};
  if (!cookieString) return cookies;
  
  cookieString.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  
  return cookies;
};

/**
 * Get a specific cookie value by name
 * @param {string} cookieName - The name of the cookie to retrieve
 * @returns {string|null} The cookie value if found, null otherwise
 */
export const getCookie = (cookieName) => {
  if (typeof document === 'undefined') return null;
  
  const cookies = parseCookies(document.cookie);
  return cookies[cookieName] || null;
};

/**
 * Parse the userDataNonHTTP cookie and extract user information
 * @returns {Object|null} Object containing user data or null if not found
 */
export const getUserDataFromCookie = () => {
  try {
    const userDataCookie = getCookie('userDataNonHTTP');
    if (!userDataCookie) {
      console.log('[COOKIE UTILS] userDataNonHTTP cookie not found');
      return null;
    }

    // Parse the JSON data from the cookie
    const userData = JSON.parse(userDataCookie);
    console.log('[COOKIE UTILS] Parsed user data from cookie:', userData);
    
    return {
      role: userData.role,
      user_id: userData.user_id,
      ...userData // Include any other properties from the cookie
    };
  } catch (error) {
    console.error('[COOKIE UTILS] Failed to parse userDataNonHTTP cookie:', error);
    return null;
  }
};

/**
 * Get all cookies as an object
 * @returns {Object} Object containing all cookies
 */
export const getAllCookies = () => {
  if (typeof document === 'undefined') return {};
  return parseCookies(document.cookie);
};
