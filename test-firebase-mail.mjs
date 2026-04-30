import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

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

async function testFirebaseNotification() {
  const testEmail = process.argv[2] || "kavya@eduqra.com";
  console.log(`🚀 Queuing Test Email to: ${testEmail}`);
  console.log("This will work ONLY if you have the 'Trigger Email' extension set up in your Firebase Console.");

  try {
    const docRef = await addDoc(collection(db, 'mail'), {
      to: testEmail,
      message: {
        subject: "🔔 Diagnostic: Frontend Firebase Test Email",
        text: "This is a test notification from the Eduqra Frontend logic.",
        html: `
          <div style="font-family: sans-serif; background: #fff; padding: 40px; border-radius: 12px; border: 1px solid #efefef;">
            <h2 style="color: #0047ab;">Diagnostic Success!</h2>
            <p>If you received this, your <strong>Firebase Trigger Email Extension</strong> is working perfectly.</p>
          </div>
        `
      },
      timestamp: serverTimestamp()
    });
    console.log(`✅ Document created with ID: ${docRef.id}`);
    console.log("Wait 15 seconds, then check your inbox!");
  } catch (error) {
    console.error("❌ Firebase Error:", error);
  }
}

testFirebaseNotification();
