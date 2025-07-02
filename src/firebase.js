// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Import getAuth

// Your web app's Firebase configuration (REPLACE WITH YOUR ACTUAL CONFIG)
const firebaseConfig = {
  apiKey: "AIzaSyC8ovYtPmE5QdeZnNQGTc0I2WfuvqLursM",
  authDomain: "hackathon-99817.firebaseapp.com",
  projectId: "hackathon-99817",
  storageBucket: "hackathon-99817.firebasestorage.app",
  messagingSenderId: "196635937156",
  appId: "1:196635937156:web:5289a52b9787a8493e35d1",
  measurementId: "G-3TLVSX088F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the authentication service and EXPORT IT
export const auth = getAuth(app); // This line is crucial for 'export auth' error

// If you plan to use Firestore for roles:
// import { getFirestore } from 'firebase/firestore';
// export const db = getFirestore(app);