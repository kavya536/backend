import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

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

async function checkMailStatus() {
  console.log("🔍 Investigating Firestore 'mail' collection delivery status...");
  console.log("-----------------------------------------");

  try {
    const mailRef = collection(db, 'mail');
    // Get the last 10 email attempts
    const q = query(mailRef, limit(10));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log("❌ No email documents found in 'mail' collection.");
      console.log("Tip: This means the frontend hasn't successfully queued any emails yet.");
    } else {
      snap.forEach(doc => {
        const data = doc.data();
        const delivery = data.delivery || {};
        const state = delivery.state || "PENDING (Waiting for Extension)";
        const error = delivery.error || "None";
        
        console.log(`📧 Email to: ${data.to}`);
        console.log(`   └─ Subject: ${data.message ? data.message.subject : 'N/A'}`);
        console.log(`   └─ Status: ${state}`);
        if (state === 'ERROR') {
          console.log(`   └─ ❌ Error Detail: ${error}`);
        }
        console.log("-----------------------------------------");
      });
    }
  } catch (err) {
    console.error("❌ Error checking Firestore mail:", err);
  }
  process.exit();
}

checkMailStatus();
