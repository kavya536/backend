const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
  sendWelcomeEmail, 
  sendTutorRegistrationReceipt,
  sendBookingConfirmationEmail,
  sendPasswordResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendVerificationEmail
} = require('./emailService');
const multer = require('multer');
const crypto = require('crypto');

// Multer local storage setup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir); // Use absolute path
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});

// Accepting all possible field names from frontend to avoid "Unexpected field" errors
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const uploadFields = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'avatar', maxCount: 1 },
  { name: 'idProof', maxCount: 1 },
  { name: 'identityProof', maxCount: 1 },
  { name: 'qualificationDocs', maxCount: 1 },
  { name: 'degreeCertificate', maxCount: 1 },
  { name: 'experienceDocs', maxCount: 1 },
  { name: 'experienceCertificate', maxCount: 1 },
  { name: 'demoVideo', maxCount: 1 },
  { name: 'videoURL', maxCount: 1 }
]);

// Local Storage URL Helper
function getLocalFileUrl(req, filename) {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/${filename}`;
}

async function handleFileUpload(file, req) {
  if (!file) return null;
  try {
    // Files are already saved locally by Multer in the 'uploads/' folder
    // We just return the public absolute URL
    return getLocalFileUrl(req, file.filename);
  } catch (error) {
    console.error("Local File URL Generation Error:", error);
    throw error;
  }
}

// Firebase Configuration
const { initializeApp } = require("firebase/app");
const { 
  getFirestore, doc, updateDoc, getDoc, setDoc, deleteDoc, 
  serverTimestamp, query, collection, where, getDocs, addDoc,
  deleteField, increment, arrayUnion
} = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyDwXgG11d-FJc1IkRLs9_H7tR6NBIKXDbw",
  authDomain: "tutor-website-c532a.firebaseapp.com",
  projectId: "tutor-website-c532a",
  storageBucket: "tutor-website-c532a.firebasestorage.app",
  messagingSenderId: "925264880105",
  appId: "1:925264880105:web:59a1d97951995179466b78"
};

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Initialize Firebase Admin for Push Notifications
if (!admin.apps.length) {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: "tutor-website-c532a",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    console.log("✅ Firebase Admin initialized (Push Notifications enabled)");
  } else {
    console.warn("⚠️ Firebase Admin credentials missing. Push notifications will be disabled.");
  }
}

const sendPushNotification = async (userEmail, title, body) => {
  try {
    if (!userEmail) return;
    const userRef = doc(db, 'users', userEmail.replace(/\./g, '_'));
    const userSnap = await getDoc(userRef);
    
    // Check both 'users' and alternate collections if needed, 
    // but standardizing on 'users' with fcmTokens array
    let tokens = [];
    if (userSnap.exists()) {
      tokens = userSnap.data().fcmTokens || [];
    }

    if (tokens.length === 0) return;

    const message = {
      notification: { title, body },
      tokens: tokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`Push notification sent to ${userEmail}:`, response.successCount);
  } catch (error) {
    console.error('Push Notification Error:', error);
  }
};


/**
 * Endpoint to APPROVE a tutor
 */
app.post('/api/approve-tutor', async (req, res) => {
  const { tutorId } = req.body;
  if (!tutorId) return res.status(400).send({ message: "Missing tutorId" });

  try {
    const userRef = doc(db, 'users', tutorId);
    const tutorRef = doc(db, 'tutors', tutorId);
    
    const userSnap = await getDoc(userRef);
    const tutorSnap = await getDoc(tutorRef);
    
    if (!userSnap.exists() && !tutorSnap.exists()) {
       return res.status(404).send({ message: "Tutor record not found." });
    }

    const tutorData = userSnap.exists() ? userSnap.data() : tutorSnap.data();
    
    // 1. Update the MASTER record in 'users' collection
    const updatePayload = { 
      status: 'approved', 
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp() 
    };
    if (userSnap.exists()) await updateDoc(userRef, updatePayload);

    // 2. Keep LEGACY 'tutors' collection in sync for UI compatibility
    if (tutorSnap.exists()) {
      await updateDoc(tutorRef, updatePayload);
    } else {
      await setDoc(doc(db, 'tutors', tutorId), { ...tutorData, ...updatePayload });
    }

    // Cleanup rejection history
    try {
      const rejectRef = doc(db, 'rejectedProfiles', tutorId);
      const rejectSnap = await getDoc(rejectRef);
      if (rejectSnap.exists()) await deleteDoc(rejectRef);
    } catch(e) { console.warn("[CLEANUP ERROR]", e); }

    // Notify Tutor (Decoupled)
    try {
      if (tutorData.email) {
        // Set initial activation status to false
        await updateDoc(userRef, { activated: false });
        
        await sendApprovalEmail({ ...tutorData, uid: tutorId });
        
        // UNIFIED NOTIFICATIONS SYNC
        const notifData = {
          receiverRole: 'tutor',
          tutorId: tutorId,
          type: 'approval',
          title: 'Registration Approved! 🎉',
          message: 'Welcome to Eduqra! Please check your email to activate your account.',
          time: serverTimestamp(),
          read: false
        };
        await addDoc(collection(db, 'notifications'), notifData);
        await addDoc(collection(db, 'tutor_notifications'), notifData); // Legacy sync
        
        await sendPushNotification(tutorData.email, notifData.title, notifData.message);
        console.log(`✅ [APPROVE] ${tutorData.email} notified (Pending Activation).`);
      }
    } catch (emailError) {
      console.error("⚠️ [EMAIL ERROR]", emailError);
    }
    
    res.status(200).send({ message: "Tutor approved successfully. Master record updated in 'users'." });
  } catch (error) {
    console.error("❌ [APPROVE ERROR]", error);
    res.status(500).send({ message: error.message });
  }
});

/**
 * Endpoint to ACTIVATE a tutor account via Magic Link (Direct Backend Redirect)
 */
app.get('/api/activate-tutor', async (req, res) => {
  const { id } = req.query; // Changed to query param for direct browser link support
  if (!id) return res.status(400).send("Missing tutor ID.");

  try {
    const userRef = doc(db, 'users', id);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return res.status(404).send("Account record not found.");
    }

    const data = userSnap.data();
    if (data.status !== 'approved') {
      return res.status(403).send("Account must be approved by admin before activation.");
    }

    // Mark as activated
    await updateDoc(userRef, { 
      activated: true,
      activatedAt: serverTimestamp()
    });

    console.log(`✨ [ACTIVATION] ${data.email} has activated their account.`);
    
    // Redirect to the tutor dashboard login with a success message
    res.redirect('https://eduqra-tutor-dashboard.web.app/login?activated=true');
  } catch (error) {
    console.error("❌ [ACTIVATION ERROR]", error);
    res.status(500).send("Failed to activate account. Please try again or contact support.");
  }
});

/**
 * Endpoint to REJECT a tutor
 */
app.post('/api/reject-tutor', async (req, res) => {
  const { tutorId, feedback } = req.body;
  if (!tutorId) return res.status(400).send({ message: "Missing tutorId" });

  try {
    const userRef = doc(db, 'users', tutorId);
    const tutorRef = doc(db, 'tutors', tutorId);
    
    const userSnap = await getDoc(userRef);
    const tutorSnap = await getDoc(tutorRef);
    
    if (!userSnap.exists() && !tutorSnap.exists()) {
      return res.status(404).send({ message: "Tutor not found." });
    }

    const tutorData = (userSnap.exists() ? userSnap.data() : tutorSnap.data());
    const reason = feedback || 'Verification failed. Please review your documents.';

    // 1. Update the MASTER record in 'users' collection
    const userRefActual = doc(db, 'users', tutorId);
    await updateDoc(userRefActual, { 
      status: 'rejected', 
      rejectionReason: reason,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 2. Keep LEGACY 'rejectedProfiles' collection in sync for UI compatibility
    await setDoc(doc(db, 'rejectedProfiles', tutorId), {
      ...tutorData,
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: serverTimestamp()
    });

    // 3. Clean up from 'tutors' (approved) collection if they were there
    if (tutorSnap.exists()) await deleteDoc(tutorRef);

    // Notify Tutor (Decoupled)
    try {
      if (tutorData.email) {
        await sendRejectionEmail(tutorData, reason);
        
        // UNIFIED NOTIFICATIONS SYNC
        const notifData = {
          receiverRole: 'tutor',
          tutorId: tutorId,
          type: 'rejection',
          title: 'Action Required: Registration',
          message: 'Your registration needs attention. Please check your email for details.',
          time: serverTimestamp(),
          read: false
        };
        await addDoc(collection(db, 'notifications'), notifData);
        await addDoc(collection(db, 'tutor_notifications'), notifData); // Legacy sync
        
        await sendPushNotification(tutorData.email, notifData.title, notifData.message);
        console.log(`❌ [REJECT] ${tutorData.email} notified.`);
      }
    } catch (emailError) {
      console.error("⚠️ [EMAIL ERROR]", emailError);
    }

    res.status(200).send({ message: "Tutor rejected successfully." });
  } catch (error) {
    console.error("❌ [REJECT ERROR]", error);
    res.status(500).send({ message: error.message || "Internal server error." });
  }
});

/**
 * Generate Secure Verification Token
 */
const generateVerificationToken = async (userId, role) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

  // Store in 'verificationTokens' collection
  await setDoc(doc(db, 'verificationTokens', hashedToken), {
    userId,
    role,
    expiresAt,
    usedAt: null,
    createdAt: serverTimestamp()
  });

  return token;
};

/**
 * Endpoint to SEND Verification Email
 */
app.post('/api/auth/send-verification', async (req, res) => {
  const { userId, email, name, role } = req.body;
  if (!userId || !email) return res.status(400).send({ message: "Missing required details." });

  try {
    // Expire any old tokens for this user
    const q = query(collection(db, 'verificationTokens'), where('userId', '==', userId), where('usedAt', '==', null));
    const oldTokens = await getDocs(q);
    const batchPromises = oldTokens.docs.map(d => updateDoc(d.ref, { usedAt: serverTimestamp(), expired: true }));
    await Promise.all(batchPromises);

    const token = await generateVerificationToken(userId, role || 'student');
    await sendVerificationEmail(email, name, token, role || 'student');

    res.status(200).send({ message: "Verification email sent successfully." });
  } catch (error) {
    console.error("❌ [SEND VERIFICATION ERROR]", error);
    res.status(500).send({ message: "Failed to send verification email." });
  }
});

/**
 * Endpoint to VERIFY Email (Magic Link)
 */
app.get('/api/auth/verify', async (req, res) => {
  const { token, role } = req.query;
  if (!token) return res.status(400).send("Verification token missing.");

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRef = doc(db, 'verificationTokens', hashedToken);
    const tokenSnap = await getDoc(tokenRef);

    if (!tokenSnap.exists()) return res.status(400).send("Invalid verification link.");
    
    const tokenData = tokenSnap.data();
    if (tokenData.usedAt || tokenData.expired) return res.status(400).send("Verification link has already been used or has expired.");
    if (tokenData.expiresAt.toDate() < new Date()) return res.status(400).send("Verification link has expired.");

    // Mark Token as used
    await updateDoc(tokenRef, { usedAt: serverTimestamp() });

    // Update User Record
    const userRef = doc(db, 'users', tokenData.userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    const currentStatus = userData.status || 'pending';

    const updatePayload = {
      email_verified: true,
      email_verified_at: serverTimestamp(),
      // If they were already approved, keep them approved. Otherwise, set to pending.
      status: (role === 'tutor' && currentStatus !== 'approved') ? 'pending' : (role === 'student' ? 'active' : currentStatus)
    };

    await updateDoc(userRef, updatePayload);

    // Sync to specialized collections if necessary
    if (role === 'tutor' && currentStatus === 'approved') {
      await setDoc(doc(db, 'tutors', tokenData.userId), updatePayload, { merge: true });
    }

    console.log(`✅ [VERIFIED] User ${tokenData.userId} (${role}) verified their email.`);

    // Redirect to login
    const loginUrl = role === 'tutor' 
      ? (process.env.TUTOR_LOGIN_URL || 'https://eduqra-tutor-dashboard.web.app/login?verified=true')
      : (process.env.STUDENT_LOGIN_URL || 'https://eduqra-student-hub.web.app/login?verified=true');
    
    res.redirect(loginUrl);
  } catch (error) {
    console.error("❌ [VERIFY ERROR]", error);
    res.status(500).send("Internal server error during verification.");
  }
});

/**
 * Password Reset Proxy
 */
app.post(['/api/auth/reset-password', '/api/auth/reset_password'], async (req, res) => {
  const { email } = req.body;
  console.log(`📨 [PWD RESET] Request received for: ${email} (via ${req.path})`);
  if (!email) return res.status(400).send({ message: "Missing email" });

  try {
    // Check both 'users' and legacy 'tutors' collections
    const qUsers = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const qTutors = query(collection(db, 'tutors'), where('email', '==', email.toLowerCase()));
    
    const [snapUsers, snapTutors] = await Promise.all([getDocs(qUsers), getDocs(qTutors)]);
    
    // Internal logging to help troubleshoot email delivery
    if (snapUsers.empty && snapTutors.empty) {
      console.log(`🔎 [PWD RESET] No records found for: ${email}. Returning obfuscated success.`);
      return res.status(200).send({ 
        message: "If you have previously registered with this email, you will receive a password reset link shortly. Please check your inbox.",
        status: 'obfuscated'
      });
    }

    console.log(`✅ [PWD RESET] Records found for: ${email}. Generating secure link via Admin SDK...`);
    
    let resetLink;
    try {
      // Generate a reset link that uses the default Firebase handler (to satisfy "reset to email is enough")
      resetLink = await admin.auth().generatePasswordResetLink(email);
      console.log(`🔗 [PWD RESET] Link generated successfully.`);
    } catch (linkError) {
      console.error(`❌ [PWD RESET LINK ERROR]`, linkError);
      // Fallback to manual link if Admin SDK fails but we know user exists
      return res.status(500).send({ message: "Unable to generate reset link. Please try again later." });
    }

    // Send custom branded email
    const emailResult = await sendPasswordResetEmail(email, resetLink);

    if (emailResult.success) {
       console.log(`📧 [PWD RESET] Custom branded email sent to: ${email}`);
       return res.status(200).send({ 
         message: "A secure password reset link has been sent to your email. Please check your inbox." 
       });
    }
    
    console.error(`❌ [PWD RESET EMAIL ERROR]`, emailResult.error);
    return res.status(500).send({ message: "Failed to deliver reset email. Please try again." });
  } catch (error) {
    console.error("❌ [PWD RESET ERROR]", error);
    res.status(500).send({ message: "Unable to process request right now. Please try again later." });
  }
});

/**
 * Endpoint to REGISTER a tutor with file uploads
 */
app.post('/api/register-tutor', uploadFields, async (req, res) => {
  const { tutorId, name, email, phone, qualification, experience, targetClasses } = req.body;
  
  if (!tutorId || !email) {
    console.error("❌ [REGISTER ERROR] Missing tutorId or email", req.body);
    return res.status(400).send({ message: "Missing required tutor details (tutorId, email)." });
  }

  try {
    console.log(`🚀 [REGISTER] Processing tutor: ${email} (${tutorId})`);
    
    const fileURLs = {};
    const files = req.files;
    
    if (files) {
      console.log(`📂 [FILES] Received ${Object.keys(files).length} file fields.`);
      
      // Map all incoming files to their respective URL slots
      // We check all aliases for each category
      
      const profileFile = files['profileImage']?.[0] || files['avatar']?.[0];
      if (profileFile) {
        fileURLs.profilePic = fileURLs.avatar = await handleFileUpload(profileFile, req);
      }
      
      const idFile = files['idProof']?.[0] || files['identityProof']?.[0];
      if (idFile) {
        fileURLs.identityPic = fileURLs.identityProof = await handleFileUpload(idFile, req);
      }
      
      const qualFile = files['qualificationDocs']?.[0] || files['degreeCertificate']?.[0];
      if (qualFile) {
        fileURLs.educationCert = fileURLs.degreeCertificate = await handleFileUpload(qualFile, req);
      }
      
      const expFile = files['experienceDocs']?.[0] || files['experienceCertificate']?.[0];
      if (expFile) {
        fileURLs.experienceCert = fileURLs.experienceCertificate = await handleFileUpload(expFile, req);
      }
      
      const demoFile = files['demoVideo']?.[0] || files['videoURL']?.[0];
      if (demoFile) {
        fileURLs.demoVideo = fileURLs.videoURL = await handleFileUpload(demoFile, req);
      }
    } else {
      console.warn(`⚠️ [REGISTER] No files received for ${email}`);
    }

    // Construct Tutor Data Object
    const tutorData = {
      id: tutorId,
      name: name || '',
      email: email.toLowerCase(),
      phone: phone || '',
      qualification: qualification || '',
      experience: experience || 'Fresher',
      targetClasses: targetClasses || '',
      status: 'pending',
      email_verified: false,
      first_login_completed: false,
      role: 'tutor',
      createdAt: serverTimestamp(),
      ...fileURLs,
      // Ensure all standard document aliases are at top level
      identityPic: fileURLs.identityPic || fileURLs.identityProof || '',
      identityProof: fileURLs.identityProof || fileURLs.identityPic || '',
      educationCert: fileURLs.educationCert || fileURLs.degreeCertificate || '',
      degreeCertificate: fileURLs.degreeCertificate || fileURLs.educationCert || '',
      experienceCert: fileURLs.experienceCert || fileURLs.experienceCertificate || '',
      experienceCertificate: fileURLs.experienceCertificate || fileURLs.experienceCert || '',
      demoVideo: fileURLs.demoVideo || fileURLs.videoURL || '',
      videoURL: fileURLs.videoURL || fileURLs.demoVideo || '',
      // Nested for full compatibility with all admin components
      documents: {
        profileImage: fileURLs.profilePic || fileURLs.avatar || '',
        identityProof: fileURLs.identityPic || fileURLs.identityProof || '',
        degreeCertificate: fileURLs.educationCert || fileURLs.degreeCertificate || '',
        experienceCertificate: fileURLs.experienceCert || fileURLs.experienceCertificate || '',
        demoVideo: fileURLs.demoVideo || fileURLs.videoURL || ''
      }
    };

    // Filter out empty strings from documents object to keep it clean
    Object.keys(tutorData.documents).forEach(key => {
      if (!tutorData.documents[key]) delete tutorData.documents[key];
    });

    // Remove empty documents object if no files uploaded
    if (Object.keys(tutorData.documents).length === 0) {
      delete tutorData.documents;
    }

    // Save to Firestore
    console.log(`💾 [FIRESTORE] Saving tutor data for ${tutorId}:`, { 
      status: tutorData.status, 
      hasDocs: !!tutorData.documents,
      docKeys: tutorData.documents ? Object.keys(tutorData.documents) : []
    });
    await setDoc(doc(db, 'users', tutorId), tutorData, { merge: true });
    
    // Add Unified Notification
    const notifData = {
      type: 'Registration',
      tutorId: tutorId,
      title: 'New Tutor Registered',
      message: `${name || email} is awaiting verification.`,
      time: serverTimestamp(),
      read: false
    };
    await addDoc(collection(db, 'notifications'), { ...notifData, receiverRole: 'admin' });
    await addDoc(collection(db, 'admin_notifications'), notifData); // Legacy sync

    // Send Verification Email
    try {
      const token = await generateVerificationToken(tutorId, 'tutor');
      await sendVerificationEmail(email, name, token, 'tutor');
      // Also send receipt for context
      await sendTutorRegistrationReceipt(tutorData);
    } catch (emailErr) {
      console.warn("[EMAIL ERROR] Could not send verification/receipt email:", emailErr);
    }

    res.status(200).send({ message: "Registration successful. Please verify your email to proceed.", tutorData });
  } catch (error) {
    console.error("❌ [REGISTER ERROR]", error);
    res.status(500).send({ message: error.message || "Internal server error during registration." });
  }
});

/**
 * Administrative Actions: Approve/Reject Tutor
 * Flat path used to avoid middleware nesting issues
 */
app.get('/api/admin-tutor-action', (req, res) => res.status(200).send("Admin API is Active"));

app.post('/api/admin-tutor-action', async (req, res) => {
  const { tutorId, action, reason } = req.body;
  console.log(`[ADMIN ACTION] Request: ${action} for ID: ${tutorId}`);
  
  if (!tutorId || !action) return res.status(400).send({ message: "Missing tutorId or action" });

  try {
    console.log(`[ADMIN ACTION] Starting ${action} for tutor: ${tutorId}`);
    
    const userRef = doc(db, 'users', tutorId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error(`[ADMIN ERROR] Tutor ID ${tutorId} not found in 'users' collection.`);
      return res.status(404).send({ message: "Tutor not found in database." });
    }
    const tutorData = userSnap.data();
    console.log(`[ADMIN] Current database status: ${tutorData.status}`);

    if (action === 'approve') {
      console.log(`[ADMIN] Executing APPROVE logic for ${tutorId}`);
      // 1. Update users collection
      await updateDoc(userRef, { 
        status: 'approved', 
        email_verified: false,
        approvedAt: serverTimestamp(),
        rejectionReason: deleteField() 
      });
      console.log(`[ADMIN] Step 1: 'users' collection updated to approved.`);

      // 2. Sync to tutors collection
      await setDoc(doc(db, 'tutors', tutorId), { 
        ...tutorData, 
        status: 'approved', 
        email_verified: false,
        approvedAt: serverTimestamp() 
      }, { merge: true });
      console.log(`[ADMIN] Step 2: 'tutors' collection synced.`);

      // 3. Send Approval Email
      try {
        const token = await generateVerificationToken(tutorId, 'tutor');
        await sendApprovalEmail({ name: tutorData.name, email: tutorData.email, id: tutorId }, token);
        console.log(`[ADMIN] Step 3: Approval email sent.`);
      } catch (emailErr) {
        console.warn("[ADMIN WARNING] Email failed:", emailErr.message);
      }

      // 4. Cleanup
      try {
        const rejectRef = doc(db, 'rejectedProfiles', tutorId);
        const rejectSnap = await getDoc(rejectRef);
        if (rejectSnap.exists()) await deleteDoc(rejectRef);
      } catch(e) { console.warn("[ADMIN] Cleanup warning:", e.message); }

    } else if (action === 'reject') {
      console.log(`[ADMIN] Executing REJECT logic for ${tutorId}`);
      const feedback = reason || 'Requirements not met.';
      
      // 1. Update users collection
      await updateDoc(userRef, { 
        status: 'rejected', 
        rejectionReason: feedback,
        rejectedAt: serverTimestamp()
      });
      console.log(`[ADMIN] Step 1: 'users' collection updated to rejected.`);

      // 2. Push to rejectedProfiles
      await setDoc(doc(db, 'rejectedProfiles', tutorId), { 
        ...tutorData, 
        status: 'rejected', 
        rejectionReason: feedback, 
        rejectedAt: serverTimestamp() 
      }, { merge: true });
      console.log(`[ADMIN] Step 2: 'rejectedProfiles' collection updated.`);

      // 3. Clean up from 'tutors'
      try {
        const tutorRef = doc(db, 'tutors', tutorId);
        const tutorSnap = await getDoc(tutorRef);
        if (tutorSnap.exists()) await deleteDoc(tutorRef);
        console.log(`[ADMIN] Step 3: Cleaned up from 'tutors' collection.`);
      } catch(e) { console.warn("[ADMIN] Cleanup warning:", e.message); }

      // 4. Send Rejection Email
      try {
        await sendRejectionEmail({ name: tutorData.name, email: tutorData.email }, feedback);
        console.log(`[ADMIN] Step 4: Rejection email sent.`);
      } catch (emailErr) {
        console.warn("[ADMIN WARNING] Rejection email failed:", emailErr.message);
      }
    }

    console.log(`[ADMIN SUCCESS] ${action} completed successfully for ${tutorId}`);
    res.status(200).send({ message: `Tutor ${action} successful` });
  } catch (error) {
    console.error(`❌ [ADMIN ACTION ERROR] ${action}:`, error);
    res.status(500).send({ message: "Internal server error performing action." });
  }
});

/**
 * Resend Admin Notification (Approval/Rejection)
 */
app.post('/api/admin/resend-notification', async (req, res) => {
  const { tutorId } = req.body;
  if (!tutorId) return res.status(400).send({ message: "Missing tutorId" });

  try {
    const userRef = doc(db, 'users', tutorId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return res.status(404).send({ message: "Tutor not found" });
    const tutorData = userSnap.data();

    if (tutorData.status === 'approved') {
      const token = await generateVerificationToken(tutorId, 'tutor');
      await sendApprovalEmail({ name: tutorData.name, email: tutorData.email, id: tutorId }, token);
    } else if (tutorData.status === 'rejected') {
      await sendRejectionEmail({ name: tutorData.name, email: tutorData.email }, tutorData.rejectionReason);
    } else {
      return res.status(400).send({ message: "Notification can only be resent for Approved or Rejected tutors." });
    }

    res.status(200).send({ message: "Notification resent successfully." });
  } catch (error) {
    console.error("❌ [RESEND NOTIF ERROR]", error);
    res.status(500).send({ message: "Internal server error resending notification." });
  }
});

/**
 * Student Registration Notification
 */
app.post('/api/register-student', async (req, res) => {
  const { studentId, name, email } = req.body;
  if (!studentId) return res.status(400).send({ message: "Missing studentId" });

  try {
    let snap = await getDoc(doc(db, 'students', studentId));
    
    // Auto-provision student record if missing (Fixes 404 for first-time Google logins)
    if (!snap.exists()) {
        console.log(`🆕 [PROVISIONING] Creating new student record for ID: ${studentId}`);
        const newStudent = {
            name: name || "Student",
            email: email || "user@scholar.com",
            mobile: "",
            class: "10",
            board: "CBSE",
            subjects: [], // Mandatory for Admin Panel rendering
            totalBookings: 0, // Mandatory for Admin Panel rendering
            status: "EMAIL_NOT_VERIFIED", // Initial status
            email_verified: false,
            first_login_completed: false,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Student')}&background=random&color=fff`, // Reliable placeholder avatar
            notifications: { reminders: true, messages: true, updates: true },
            createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'students', studentId), newStudent);
        // Also sync to 'users' collection as it's the unified auth source
        await setDoc(doc(db, 'users', studentId), { ...newStudent, role: 'student' });
        snap = await getDoc(doc(db, 'students', studentId));
    }

    const student = snap.data();
    
    // Send Verification Email instead of direct welcome
    try {
      const token = await generateVerificationToken(studentId, 'student');
      await sendVerificationEmail(student.email, student.name, token, 'student');
    } catch (emailErr) {
      console.warn("[EMAIL ERROR] Could not send student verification email:", emailErr);
    }
    
    res.status(200).send({ message: "Student registration successful. Verification link sent." });
  } catch (error) {
    console.error("❌ [STUDENT REG ERROR]", error);
    res.status(500).end();
  }
});

/**
 * Booking Success Notification & Data Synchronization
 */
app.post('/api/booking-success', async (req, res) => {
  const { booking, studentId } = req.body;
  if (!booking || !booking.studentEmail) return res.status(400).send({ message: "Missing booking data" });

  try {
    // 1. Notify student and tutor
    await sendBookingConfirmationEmail(booking);
    await sendPushNotification(booking.studentEmail, 'Booking Confirmed!', `Your session with ${booking.tutorName || 'Tutor'} has been confirmed for ${booking.date}.`);
    if (booking.tutorEmail) {
      await sendPushNotification(booking.tutorEmail, 'New Booking Received! 📚', `${booking.studentName || 'A student'} has booked a session for ${booking.date} at ${booking.time}.`);
    }

    // 2. DATA READABILITY SYNC: Store booking details inside the student document
    // We try to find the student by ID first, then by email
    let sId = studentId;
    if (!sId) {
        const q = query(collection(db, 'students'), where('email', '==', booking.studentEmail.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) sId = snap.docs[0].id;
    }

    if (sId) {
        const studentRef = doc(db, 'students', sId);
        await updateDoc(studentRef, {
            totalBookings: increment(1),
            lastBookingAt: serverTimestamp(),
            // Maintain a history of bookings inside the student document for readability
            bookingsHistory: arrayUnion({
                tutorName: booking.tutorName,
                subject: booking.subject,
                date: booking.date,
                time: booking.time,
                duration: booking.duration || "1 Hour",
                plan: booking.plan || "One Month",
                amount: booking.amount || 0,
                status: 'confirmed',
                timestamp: new Date().toISOString()
            })
        });
        console.log(`📊 [SYNC] Updated student ${booking.studentEmail} with new booking details.`);
    }

    res.status(200).send({ message: "Booking confirmation sent and data synced." });
  } catch (error) {
    console.error("❌ [BOOKING SUCCESS SYNC ERROR]", error);
    res.status(500).end();
  }
});

/**
 * Create Razorpay Order
 */
const Razorpay = require('razorpay');
app.post('/api/create-razorpay-order', async (req, res) => {
  try {
    const { amount, receipt } = req.body;
    if (!amount) return res.status(400).send({ message: "Amount is required" });

    // Ensure API keys are present in .env
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("❌ Missing Razorpay API Keys in backend/.env file");
      return res.status(500).send({ message: "Payment Gateway is not configured correctly." });
    }

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: receipt || `rcpt_${Date.now()}`
    };

    const order = await instance.orders.create(options);
    if (!order) return res.status(500).send({ message: "Some error occurred creating Razorpay order" });

    res.status(200).send({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error("❌ [RAZORPAY ORDER ERROR]", error);
    res.status(500).send({ message: error.message || "Internal Server Error" });
  }
});

const PORT = 5001;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  // Join Room Logic
  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userId = userId;

    // Get all other users in this room
    const clients = io.sockets.adapter.rooms.get(roomId);
    const otherUsers = [];
    if (clients) {
      clients.forEach((clientId) => {
        if (clientId !== socket.id) {
          const clientSocket = io.sockets.sockets.get(clientId);
          otherUsers.push({
            socketId: clientId,
            userId: clientSocket?.userId,
          });
        }
      });
    }

    // Tell the new user who else is in the room
    socket.emit('all-users', otherUsers);

    // Tell everyone else that a new user has joined
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userId: userId,
      userName: userName
    });

    console.log(`👤 [ROOM] User ${userId} joined room ${roomId}`);
  });

  // Signaling: Relay messages between specific peers
  socket.on('signal', (data) => {
    // data: { to: socketId, from: socketId, signal: offer/answer/candidate }
    io.to(data.to).emit('signal', {
      from: socket.id,
      signal: data.signal,
      userId: socket.userId
    });
  });

  // Chat Messages
  socket.on('send-message', (data) => {
    // data: { roomId, text, sender, time }
    io.to(data.roomId).emit('receive-message', data);
  });

  // State Sync: Mute/Camera/ScreenShare
  socket.on('update-state', (data) => {
    socket.to(data.roomId).emit('peer-state-changed', {
      socketId: socket.id,
      ...data
    });
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('user-left', socket.id);
      console.log(`👋 [ROOM] User ${socket.userId} left room ${socket.roomId}`);
    }
  });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
