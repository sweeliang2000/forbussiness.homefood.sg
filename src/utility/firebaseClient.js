// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBHcQdmjjl-VeZ40Ftwgv5hkXAl69xT7Wc",
  authDomain: "collbine-forbusiness.firebaseapp.com",
  projectId: "collbine-forbusiness",
  storageBucket: "collbine-forbusiness.firebasestorage.app",
  messagingSenderId: "481712119072",
  appId: "1:481712119072:web:499ef827905ad9d930cb45",
  measurementId: "G-XBSKLF563H"
};

// Initialize Firebase
// Check if Firebase app is already initialized to avoid duplicate initialization
let app;
if (typeof window !== "undefined" && !getApps().length) {
  app = initializeApp(firebaseConfig);
} else if (getApps().length > 0) {
  app = getApps()[0];
} else {
  app = initializeApp(firebaseConfig);
}

// Initialize Analytics only on the client side
let analytics = null;
if (typeof window !== "undefined") {
  // Check if analytics is supported before initializing
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Initialize Remote Config only on the client side
let remoteConfig = null;
if (typeof window !== "undefined") {
  remoteConfig = getRemoteConfig(app);
  // Set default values and fetch interval
  remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
  remoteConfig.defaultConfig = {
    notification_banner_message: JSON.stringify({
      is_shown: false,
      id: "",
      message: "",
      url: ""
    })
  };
}

/**
 * Fetch and get notification config from Remote Config
 * @returns {Promise<{is_shown: boolean, id: string, message: string, url: string} | null>}
 */
export const getNotificationConfig = async () => {
  try {
    if (typeof window === "undefined" || !remoteConfig) {
      console.log("[FIREBASE] Not in browser or remoteConfig not initialized");
      return null;
    }

    console.log("[FIREBASE] Fetching Remote Config...");
    // Fetch and activate Remote Config - returns true if new values were fetched
    const activated = await fetchAndActivate(remoteConfig);
    console.log("[FIREBASE] Remote Config fetch activated:", activated);
    
    // Get the notification message parameter
    const configValue = getValue(remoteConfig, "notification_banner_message");
    const configString = configValue.asString();
    const valueSource = configValue.getSource();
    
    console.log("[FIREBASE] Value source:", valueSource); // 'static', 'default', or 'remote'
    console.log("[FIREBASE] Raw config string from Remote Config:", configString);
    
    if (!configString) {
      console.log("[FIREBASE] Config string is empty, returning null");
      return null;
    }

    // Parse JSON config
    const config = JSON.parse(configString);
    console.log("[FIREBASE] Parsed config:", config);
    
    // Warn if using default values
    if (valueSource === 'default' || valueSource === 'static') {
      console.warn("[FIREBASE] Using default/static values. Make sure Remote Config parameter 'notification_banner_message' is published in Firebase Console.");
    }
    
    const result = {
      is_shown: config.is_shown || false,
      id: config.id || "",
      message: config.message || "",
      url: config.url || ""
    };
    
    console.log("[FIREBASE] Final notification config result:", result);
    
    return result;
  } catch (error) {
    console.error("[FIREBASE] Failed to fetch notification config:", error);
    return null;
  }
};

export const db = getFirestore(app);

export { app, analytics, remoteConfig };

