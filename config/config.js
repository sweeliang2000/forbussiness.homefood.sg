// Why /config and config.js?
// Organization: Keeps configuration files separate from business logic and components.
// Scalability: You can add more configuration files (e.g., for different environments 
//    or services) without cluttering your root directory.

const getEnvVariable = (key, fallback = '') => {
    // Access the environment variable directly - Next.js will inline NEXT_PUBLIC_ variables at build time
    const value = process.env[key];
    if (!value) {
        console.warn(`Environment variable ${key} is not set. Using fallback: ${fallback}`);
    }
    return value || fallback;
};

// Direct access to ensure Next.js can statically analyze and inline the value
export const BASE_URL_BACKEND = process.env.NEXT_PUBLIC_BASE_URL_BACKEND || 'http://localhost:8080';

// Supabase configuration
// Note: Service role key should only be used server-side (in API routes)
// For client-side, use anon key or API routes
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.warn('SUPABASE_URL is not set in environment variables');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
}

