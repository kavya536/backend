const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyDwXgG11d-FJc1IkRLs9_H7tR6NBIKXDbw",
  authDomain: "tutor-website-c532a.firebaseapp.com",
  projectId: "tutor-website-c532a",
  storageBucket: "tutor-website-c532a.firebasestorage.app",
  messagingSenderId: "925264880105",
  appId: "1:925264880105:web:59a1d97951995179466b78"
};

async function check() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("🔍 Searching for tutors with documents...");
  const snap = await getDocs(collection(db, 'users'));
  
  snap.forEach(doc => {
    const data = doc.data();
    if (data.role === 'tutor') {
      const hasDocs = data.documents && Object.keys(data.documents).length > 0;
      if (hasDocs) {
        console.log(`\n--- Tutor: ${data.name} ---`);
        console.log(`Documents:`, data.documents);
      }
    }
  });
  
  process.exit(0);
}

check().catch(console.error);
