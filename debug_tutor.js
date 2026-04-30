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

async function checkTutor() {
  const email = "kavyachitti818@gmail.com";
  console.log(`🔍 Searching for tutor with email: ${email}`);
  
  const collections = ['users', 'tutors', 'rejectedProfiles'];
  
  for (const coll of collections) {
    try {
      const q = query(collection(db, coll), where('email', '==', email));
      const snap = await getDocs(q);
      console.log(`Collection [${coll}]: ${snap.size} records found.`);
      snap.forEach(doc => {
        console.log(` - ID: ${doc.id}`);
        console.log(` - Status: ${doc.data().status}`);
      });
    } catch (err) {
      console.error(`Error checking collection ${coll}:`, err.message);
    }
  }
  process.exit(0);
}

checkTutor();
