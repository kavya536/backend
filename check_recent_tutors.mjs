
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

async function checkRecentTutors() {
  console.log("Checking recent tutor registrations...");
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(5));
  const querySnapshot = await getDocs(q);
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`\nID: ${doc.id}`);
    console.log(`Name: ${data.name}`);
    console.log(`Email: ${data.email}`);
    console.log(`Status: ${data.status}`);
    console.log(`CreatedAt: ${data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt}`);
    console.log(`Documents:`, JSON.stringify(data.documents || {}, null, 2));
    console.log(`Top-level Doc URLs:`);
    console.log(`- identityPic: ${data.identityPic}`);
    console.log(`- educationCert: ${data.educationCert}`);
  });
}

checkRecentTutors().catch(console.error);
