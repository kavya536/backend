const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const path = require('path');

// Load environment variables (Vercel handles this automatically)
require('dotenv').config();

// Client SDK Config
const firebaseConfig = {
  apiKey: "AIzaSyDwXgG11d-FJc1IkRLs9_H7tR6NBIKXDbw",
  authDomain: "tutor-website-c532a.firebaseapp.com",
  projectId: "tutor-website-c532a",
  storageBucket: "tutor-website-c532a.firebasestorage.app",
  messagingSenderId: "925264880105",
  appId: "1:925264880105:web:59a1d97951995179466b78"
};

let db;
let firebaseApp;

try {
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    console.log("✅ Firebase Client SDK initialized");
} catch (e) {
    console.error("❌ Firebase Client initialization failed", e);
}

// Initialize Admin SDK
try {
    if (!admin.apps.length) {
      if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: "tutor-website-c532a",
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        });
        console.log("✅ Firebase Admin initialized");
      } else {
        console.warn("⚠️ Firebase Admin credentials missing. Using default (may fail on Vercel).");
        admin.initializeApp({ projectId: "tutor-website-c532a" });
      }
    }
} catch (e) {
    console.error("❌ Firebase Admin initialization failed", e);
}

module.exports = { admin, db, firebaseApp };
