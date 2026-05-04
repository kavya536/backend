const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Client SDK Config
const firebaseConfig = {
  apiKey: "AIzaSyDwXgG11d-FJc1IkRLs9_H7tR6NBIKXDbw",
  authDomain: "tutor-website-c532a.firebaseapp.com",
  projectId: "tutor-website-c532a",
  storageBucket: "tutor-website-c532a.firebasestorage.app",
  messagingSenderId: "925264880105",
  appId: "1:925264880105:web:59a1d97951995179466b78"
};

// Initialize Client SDK
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Initialize Admin SDK
if (!admin.apps.length) {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "tutor-website-c532a",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    console.log("✅ Firebase Admin initialized (MVC Config)");
  } else {
    admin.initializeApp({ projectId: "tutor-website-c532a" });
    console.warn("⚠️ Firebase Admin credentials missing in MVC Config.");
  }
} 

module.exports = { admin, db, firebaseApp };
