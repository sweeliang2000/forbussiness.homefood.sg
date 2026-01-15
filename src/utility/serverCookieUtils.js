/**
 * Server-side utility functions for parsing and managing cookies from Next.js requests
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
 * Get cookies from Next.js request headers
 * @param {Request} request - The Next.js request object
 * @returns {Object} Object containing cookie key-value pairs
 */
export const getCookiesFromRequest = (request) => {
  const cookieHeader = request.headers.get('cookie') || '';
  return parseCookies(cookieHeader);
};

/**
 * Get a specific cookie value by name from a Next.js request
 * @param {Request} request - The Next.js request object
 * @param {string} cookieName - The name of the cookie to retrieve
 * @returns {string|null} The cookie value if found, null otherwise
 */
export const getCookieFromRequest = (request, cookieName) => {
  const cookies = getCookiesFromRequest(request);
  return cookies[cookieName] || null;
};

/**
 * Parse the userDataNonHTTP cookie from a Next.js request and extract user information
 * @param {Request} request - The Next.js request object
 * @returns {Object|null} Object containing user data (user_id, email, etc.) or null if not found
 */
export const getUserDataFromRequest = (request) => {
  try {
    const userDataCookie = getCookieFromRequest(request, 'userDataNonHTTP');
    if (!userDataCookie) {
      console.log('[SERVER COOKIE UTILS] userDataNonHTTP cookie not found');
      return null;
    }

    // Parse the JSON data from the cookie
    const userData = JSON.parse(userDataCookie);
    console.log('[SERVER COOKIE UTILS] Parsed user data from cookie:', userData);
    
    return {
      user_id: userData.user_id,
      email: userData.email || null,
      role: userData.role,
      shop_id: userData.shop_id,
      ...userData // Include any other properties from the cookie
    };
  } catch (error) {
    console.error('[SERVER COOKIE UTILS] Failed to parse userDataNonHTTP cookie:', error);
    return null;
  }
};
