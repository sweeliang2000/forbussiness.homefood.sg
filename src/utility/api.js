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
    console.log("ERROR")
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default apiClient;
