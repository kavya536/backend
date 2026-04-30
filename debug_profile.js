
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyDwXgG11d-FJc1IkRLs9_H7tR6NBIKXDbw",
  authDomain: "tutor-website-c532a.firebaseapp.com",
  projectId: "tutor-website-c532a",
  storageBucket: "tutor-website-c532a.firebasestorage.app",
  messagingSenderId: "925264880105",
  appId: "1:925264880105:web:59a1d97951995179466b78"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debug() {
  const email = process.argv[2] || "sarah.m@educra.com";
  console.log(`Searching for profile with email: ${email}`);

  const collections = ['users', 'tutors', 'rejectedProfiles'];
  for (const col of collections) {
    const q = query(collection(db, col), where("email", "==", email));
    const snap = await getDocs(q);
    console.log(`Collection '${col}': Found ${snap.size} documents`);
    snap.forEach(doc => {
      console.log(` - ID: ${doc.id}, Status: ${doc.data().status}, Role: ${doc.data().role}`);
    });
  }
}

debug().catch(console.error);
