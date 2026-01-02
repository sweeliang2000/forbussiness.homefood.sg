/**
 * Utility functions for managing notification dismissal state in localStorage
 */

const NOTIFICATION_DISMISSED_PREFIX = 'notification_dismissed_';
const DISMISSAL_EXPIRATION_DAYS = 7;

/**
 * Get the dismissal timestamp for a notification ID
 * @param {string} notificationId - The notification ID
 * @returns {string|null} The dismissal timestamp (ISO string) if found, null otherwise
 */
export const getDismissedNotification = (notificationId) => {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    
    const key = `${NOTIFICATION_DISMISSED_PREFIX}${notificationId}`;
    const timestamp = localStorage.getItem(key);
    return timestamp;
  } catch (error) {
    console.error('[NOTIFICATION STORAGE] Failed to get dismissed notification:', error);
    return null;
  }
};

/**
 * Set the dismissal timestamp for a notification ID
 * @param {string} notificationId - The notification ID
 * @returns {boolean} True if successful, false otherwise
 */
export const setDismissedNotification = (notificationId) => {
  try {
    if (typeof window === "undefined") {
      return false;
    }
    
    const key = `${NOTIFICATION_DISMISSED_PREFIX}${notificationId}`;
    const timestamp = new Date().toISOString();
    localStorage.setItem(key, timestamp);
    console.log('[NOTIFICATION STORAGE] Stored dismissal timestamp for notification:', notificationId);
    return true;
  } catch (error) {
    console.error('[NOTIFICATION STORAGE] Failed to store dismissal timestamp:', error);
    return false;
  }
};

/**
 * Check if notification should be shown based on dismissal status and 7-day expiration
 * @param {string} notificationId - The notification ID
 * @param {string|null} dismissedTimestamp - The dismissal timestamp (ISO string) or null
 * @returns {boolean} True if notification should be shown, false otherwise
 */
export const shouldShowNotification = (notificationId, dismissedTimestamp) => {
  try {
    // If no dismissal timestamp exists, show the notification
    if (!dismissedTimestamp) {
      return true;
    }

    // Parse the dismissal timestamp
    const dismissedDate = new Date(dismissedTimestamp);
    const now = new Date();
    
    // Calculate the difference in milliseconds
    const diffInMs = now - dismissedDate;
    
    // Convert to days (milliseconds to days)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    
    // If 7 or more days have passed, show the notification again
    if (diffInDays >= DISMISSAL_EXPIRATION_DAYS) {
      return true;
    }
    
    // Otherwise, don't show it
    return false;
  } catch (error) {
    console.error('[NOTIFICATION STORAGE] Failed to check notification visibility:', error);
    // On error, default to showing the notification
    return true;
  }
};

/**
 * Remove the dismissal timestamp for a notification ID
 * @param {string} notificationId - The notification ID
 * @returns {boolean} True if successful, false otherwise
 */
export const removeDismissedNotification = (notificationId) => {
  try {
    if (typeof window === "undefined") {
      return false;
    }
    
    const key = `${NOTIFICATION_DISMISSED_PREFIX}${notificationId}`;
    localStorage.removeItem(key);
    console.log('[NOTIFICATION STORAGE] Removed dismissal timestamp for notification:', notificationId);
    return true;
  } catch (error) {
    console.error('[NOTIFICATION STORAGE] Failed to remove dismissal timestamp:', error);
    return false;
  }
};

