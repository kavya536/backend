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

async function check() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("🔍 Checking for Pending Tutors in 'users' collection...");
  const q = query(collection(db, 'users'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("❌ No pending tutors found.");
  } else {
    console.log(`✅ Found ${snap.size} pending tutors:`);
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}, Name: ${data.name}, Email: ${data.email}, Role: ${data.role}`);
    });
  }

  console.log("\n🔔 Checking for Admin Notifications...");
  const nSnap = await getDocs(collection(db, 'admin_notifications'));
  console.log(`- Total Notifications: ${nSnap.size}`);
  
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
