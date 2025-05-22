import axios from 'axios';
import { BASE_URL_BACKEND } from '../../config/config';

// Create a centralized utility function for handling API calls. 
// This makes your code cleaner and easier to maintain.
const apiClient = axios.create({
  baseURL: 'http://localhost:8080/',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url;

    if (
      error.response &&
      error.response.status === 401 &&
      requestUrl !== '/api/auth/verifytoken'
    ) {
      // Optional: clear auth tokens/cookies if needed
      window.location.href = '/login?message=401 Unauthorized';
    } else {
      console.error('API Error:', error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
