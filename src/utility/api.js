import axios from 'axios';
import { BASE_URL_BACKEND } from '../../config/config';
import { SHOP_SUBSCRIPTION_STATUS, GET_LIST_OF_USERS, REFRESH_USER_COOKIE, DELETE_USER_FROM_SHOP } from './apiPaths';

// Create a centralized utility function for handling API calls. 
// This makes your code cleaner and easier to maintain.
const apiClient = axios.create({
  baseURL: BASE_URL_BACKEND,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url;
    const currentPath = window.location.pathname;

    // Don't redirect if already on login/auth pages or if it's refreshUserCookie endpoint
    const isAuthPage = currentPath.startsWith('/login') || 
                       currentPath.startsWith('/signup') || 
                       currentPath.startsWith('/verify') || 
                       currentPath.startsWith('/forgot-password');

    console.log('requestUrl:', requestUrl);

    if (
      error.response &&
      error.response.status === 401 &&
      requestUrl !== REFRESH_USER_COOKIE &&
      requestUrl !== DELETE_USER_FROM_SHOP &&
      !isAuthPage
    ) {
      // Optional: clear auth tokens/cookies if needed
      const fullPath = currentPath + window.location.search;
      const encodedPath = encodeURIComponent(fullPath);

      // Redirect to login with redirect path
      window.location.href = `/login?message=401 Unauthorized&redirect=${encodedPath}`;
    } else if (requestUrl === REFRESH_USER_COOKIE) {
      // Silently handle refreshUserCookie errors - missing cookie is expected for unauthenticated users
    } else {
      console.error('API Error:', error);
    }

    return Promise.reject(error);
  }
);

// Local storage key for shop subscription status
const SHOP_SUBSCRIPTION_STORAGE_KEY = 'shopSubscriptionStatus';

// Function to get shop subscription status with local storage caching
export const getShopSubscriptionStatus = async () => {
  try {
    // First, try to get from local storage
    const cachedData = localStorage.getItem(SHOP_SUBSCRIPTION_STORAGE_KEY);
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      console.log('Retrieved shop subscription status from local storage:', parsedData);
      return parsedData;
    }

    // If not in local storage, make API call
    const response = await apiClient.get(SHOP_SUBSCRIPTION_STATUS);
    const data = response.data;
    
    // Handle the case where lookup_key might be empty
    const subscriptionData = {
      lookup_key: data.lookup_key || null
    };
    
    // Save to local storage
    localStorage.setItem(SHOP_SUBSCRIPTION_STORAGE_KEY, JSON.stringify(subscriptionData));
    console.log('Shop subscription status saved to local storage:', subscriptionData);
    
    return subscriptionData;
  } catch (error) {
    console.error('Error fetching shop subscription status:', error);
    
    // If API call fails, try to return cached data if available
    const cachedData = localStorage.getItem(SHOP_SUBSCRIPTION_STORAGE_KEY);
    if (cachedData) {
      console.log('API failed, returning cached data:', JSON.parse(cachedData));
      return JSON.parse(cachedData);
    }
    
    // If no cached data and API fails, return null
    return { lookup_key: null };
  }
};

// Function to clear shop subscription status from local storage
export const clearShopSubscriptionStatus = () => {
  localStorage.removeItem(SHOP_SUBSCRIPTION_STORAGE_KEY);
  console.log('Shop subscription status cleared from local storage');
};

// Function to update shop subscription status in local storage
export const updateShopSubscriptionStatus = (subscriptionData) => {
  const dataToStore = {
    lookup_key: subscriptionData.lookup_key || null
  };
  
  localStorage.setItem(SHOP_SUBSCRIPTION_STORAGE_KEY, JSON.stringify(dataToStore));
  console.log('Shop subscription status updated in local storage:', dataToStore);
  return dataToStore;
};

export default apiClient;
