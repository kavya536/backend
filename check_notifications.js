const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, orderBy, limit, getDocs } = require("firebase/firestore");

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

  console.log("🔍 Checking most recent notifications...");
  const q = query(collection(db, 'admin_notifications'), orderBy('time', 'desc'), limit(5));
  const snap = await getDocs(q);
  
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`- Type: ${data.type}, TutorId: ${data.tutorId}, Message: ${data.message}, RefDoc: ${doc.id}`);
  });

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
