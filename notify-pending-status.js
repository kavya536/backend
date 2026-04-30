const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require("firebase/firestore");
const { sendApprovalEmail, sendRejectionEmail } = require('./emailService');
require('dotenv').config();

// Firebase Config from server.js
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

async function notifyExistingTutors() {
  console.log("🚀 Starting Catch-up Email Sync...");
  console.log("-----------------------------------------");

  try {
    const tutorsRef = collection(db, 'tutors');
    
    // We fetch ALL approved and rejected tutors that haven't been notified yet
    const q = query(tutorsRef, where("status", "in", ["approved", "rejected"]));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log("✅ No tutors found in Approved/Rejected status. Sync complete.");
      return;
    }

    let countApproved = 0;
    let countRejected = 0;

    for (const tutorDoc of snap.docs) {
      const tutor = tutorDoc.data();
      const tutorId = tutorDoc.id;

      // Skip already notified tutors if field exists
      if (tutor.isNotified) {
        console.log(`⏩ Skipping ${tutor.name} (${tutor.email}) - Already notified.`);
        continue;
      }

      console.log(`📧 Processing notification for: ${tutor.name} (${tutor.status})`);
      
      let res;
      if (tutor.status === 'approved') {
        res = await sendApprovalEmail(tutor);
        countApproved++;
      } else if (tutor.status === 'rejected') {
        res = await sendRejectionEmail(tutor, tutor.rejectionReason);
        countRejected++;
      }

      if (res && res.success) {
        // Mark as notified in Firestore
        await updateDoc(doc(db, 'tutors', tutorId), { isNotified: true });
        console.log(`✅ ${tutor.name} notified successfully.`);
      } else {
        console.error(`❌ Failed to notify ${tutor.name}:`, res?.error || "Unknown Error");
      }
    }

    console.log("\n-----------------------------------------");
    console.log(`📈 Sync Summary:`);
    console.log(`   - Approved Tutors Notified: ${countApproved}`);
    console.log(`   - Rejected Tutors Notified: ${countRejected}`);
    console.log("🚀 Sync Completed Successfully.");

  } catch (error) {
    console.error("❌ Fatal Error during catch-up:", error);
  } finally {
    process.exit();
  }
}

notifyExistingTutors();
