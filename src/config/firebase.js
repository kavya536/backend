const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Admin SDK
try {
    if (!admin.apps.length) {
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.client_email;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.private_key;

      if (clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: "tutor-website-c532a",
            clientEmail: clientEmail.trim(),
            privateKey: privateKey.replace(/\\n/g, '\n').trim()
          })
        });
        console.log("✅ Firebase Admin initialized (Pure Admin Mode)");
      } else {
        // Fallback for local development
        console.warn("⚠️ Firebase credentials missing, falling back to default project ID initialization");
        admin.initializeApp({ projectId: "tutor-website-c532a" });
      }
    }
} catch (e) {
    console.error("❌ Firebase Admin initialization failed", e);
}

const db = admin.firestore();

// Mock the Client SDK structures to prevent breaking other files
module.exports = { 
  admin, 
  db,
  // These help keep your other files working without changes
  doc: (db, coll, id) => db.collection(coll).doc(id),
  getDoc: (ref) => ref.get(),
  setDoc: (ref, data, opts) => ref.set(data, opts),
  updateDoc: (ref, data) => ref.update(data),
  deleteDoc: (ref) => ref.delete(),
  collection: (db, name) => db.collection(name),
  addDoc: (coll, data) => coll.add(data),
  serverTimestamp: admin.firestore.FieldValue.serverTimestamp,
  increment: admin.firestore.FieldValue.increment,
  arrayUnion: admin.firestore.FieldValue.arrayUnion,
  query: (coll, ...constraints) => {
    let q = coll;
    constraints.forEach(c => { q = q.where(c.field, c.op, c.val); });
    return q;
  },
  where: (field, op, val) => ({ field, op, val }),
  getDocs: (q) => q.get()
};
