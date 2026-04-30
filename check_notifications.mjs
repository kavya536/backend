
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, limit, getDocs } from "firebase/firestore";

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

async function checkNotifications() {
  console.log("Checking recent admin notifications...");
  const q = query(collection(db, "admin_notifications"), orderBy("time", "desc"), limit(10));
  const querySnapshot = await getDocs(q);
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`\nID: ${doc.id}`);
    console.log(`Type: ${data.type}`);
    console.log(`Title: ${data.title}`);
    console.log(`Message: ${data.message}`);
    console.log(`Time: ${data.time?.toDate ? data.time.toDate() : data.time}`);
    console.log(`TutorId: ${data.tutorId}`);
  });
}

checkNotifications().catch(console.error);
