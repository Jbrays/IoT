import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update } from "firebase/database";

// TODO: Replace with your actual Firebase configuration

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Helper to write data
export const writeData = (path, data) => {
    return set(ref(db, path), data);
};

// Helper to update data
export const updateData = (path, data) => {
    return update(ref(db, path), data);
};

// Helper to read data (listener)
export const listenToData = (path, callback) => {
    const dataRef = ref(db, path);
    return onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        callback(data);
    });
};
