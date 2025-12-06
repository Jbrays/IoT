import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update } from "firebase/database";

// TODO: Replace with your actual Firebase configuration

const firebaseConfig = {
    apiKey: "AIzaSyAUHXYlEmqcy0cDRyiFVlpjMvxlpH_dT4M",
    authDomain: "iot-project-d2c5d.firebaseapp.com",
    projectId: "iot-project-d2c5d",
    storageBucket: "iot-project-d2c5d.firebasestorage.app",
    messagingSenderId: "556839428138",
    appId: "1:556839428138:web:17608d3499478ec24de353",
    measurementId: "G-QCXPPB9RNJ",
    databaseURL: "https://iot-project-d2c5d-default-rtdb.firebaseio.com"
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
