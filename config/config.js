// Why /config and config.js?
// Organization: Keeps configuration files separate from business logic and components.
// Scalability: You can add more configuration files (e.g., for different environments 
//    or services) without cluttering your root directory.

const getEnvVariable = (key, fallback = '') => {
    const value = process.env[key];
    if (!value) {
        console.warn(`Environment variable ${key} is not set. Using fallback: ${fallback}`);
    }
    return value || fallback;
};


export const BASE_URL_BACKEND = getEnvVariable('NEXT_PUBLIC_BASE_URL_BACKEND', 'http://localhost:8080');

