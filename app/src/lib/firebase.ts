import { initializeApp, getApps } from 'firebase/app';
import {
    getAuth,
    initializeAuth,
} from 'firebase/auth';

export const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

let auth: any;
if (getApps().length === 0) {
    auth = initializeAuth(app);
} else {
    // Fallback internally during Expo Fast Refresh
    try {
        auth = getAuth(app);
    } catch {
        auth = initializeAuth(app);
    }
}

export { auth };

export default app;