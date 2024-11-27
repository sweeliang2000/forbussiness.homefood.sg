import axios from 'axios';

// Create a centralized utility function for handling API calls. 
// This makes your code cleaner and easier to maintain.
const apiClient = axios.create({
  baseURL: process.env.BE_API_BASE_URL || 'http://localhost:8080', 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
