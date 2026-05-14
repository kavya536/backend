const { 
  db, doc, getDoc, updateDoc, setDoc, deleteDoc, 
  collection, addDoc, serverTimestamp, query, where, getDocs 
} = require('../config/firebase');
const { handleFileUpload } = require('../services/fileService');
const { 
  sendApprovalEmail, 
  sendRejectionEmail, 
  sendVerificationEmail,
  sendTutorRegistrationReceipt 
} = require('../../emailService');
const crypto = require('crypto');

// Helper for tokens (moved from server.js)
const generateVerificationToken = async (userId, role) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

  await setDoc(doc(db, 'verificationTokens', hashedToken), {
    userId,
    role,
    expiresAt,
    usedAt: null,
    createdAt: serverTimestamp()
  });

  return token;
};

exports.registerTutor = async (req, res) => {
  const { tutorId, name, email, phone, qualification, experience, targetClasses } = req.body;
  console.log("📥 [TUTOR] Received registration request for:", email, tutorId);
  if (!tutorId || !email) {
    console.error("❌ Missing registration details:", { tutorId, email });
    return res.status(400).send({ message: "Missing required tutor details." });
  }

  try {
    const fileURLs = {};
    const files = req.files;
    
    if (files) {
      const profileFile = files['profileImage']?.[0] || files['avatar']?.[0];
      if (profileFile) fileURLs.profilePic = fileURLs.avatar = fileURLs.profileImage = await handleFileUpload(profileFile, req);
      
      const idFile = files['idProof']?.[0] || files['identityProof']?.[0];
      if (idFile) fileURLs.identityPic = fileURLs.identityProof = await handleFileUpload(idFile, req);
      
      const qualFile = files['qualificationDocs']?.[0] || files['degreeCertificate']?.[0];
      if (qualFile) fileURLs.educationCert = fileURLs.degreeCertificate = await handleFileUpload(qualFile, req);
      
      const expFile = files['experienceDocs']?.[0] || files['experienceCertificate']?.[0];
      if (expFile) fileURLs.experienceCert = fileURLs.experienceCertificate = await handleFileUpload(expFile, req);
      
      const demoFile = files['demoVideo']?.[0] || files['videoURL']?.[0];
      if (demoFile) fileURLs.demoVideo = fileURLs.videoURL = await handleFileUpload(demoFile, req);
      console.log("✅ [TUTOR] Files processed:", Object.keys(fileURLs));
    } else {
      console.warn("⚠️ [TUTOR] No files received.");
    }

    const tutorData = {
      id: tutorId,
      uid: tutorId, 
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
      updatedAt: serverTimestamp(),
      ...fileURLs,
      documents: {
        profileImage: fileURLs.profileImage || fileURLs.profilePic || fileURLs.avatar || '',
        identityProof: fileURLs.identityProof || fileURLs.identityPic || '',
        degreeCertificate: fileURLs.degreeCertificate || fileURLs.educationCert || '',
        experienceCertificate: fileURLs.experienceCertificate || fileURLs.experienceCert || '',
        demoVideo: fileURLs.demoVideo || fileURLs.videoURL || '',
        educationCert: fileURLs.educationCert || fileURLs.degreeCertificate || '',
        identityPic: fileURLs.identityPic || fileURLs.identityProof || '',
        profilePic: fileURLs.profilePic || fileURLs.profileImage || fileURLs.avatar || ''
      }
    };

    await setDoc(doc(db, 'users', tutorId), tutorData, { merge: true });
    
    const notifData = {
      type: 'Registration',
      tutorId: tutorId,
      title: 'New Tutor Registered',
      message: `${name || email} is awaiting verification.`,
      time: serverTimestamp(),
      read: false
    };
    await addDoc(collection(db, 'notifications'), { ...notifData, receiverRole: 'admin' });
    await addDoc(collection(db, 'admin_notifications'), notifData);

    try {
      const token = await generateVerificationToken(tutorId, 'tutor');
      await sendVerificationEmail(email, name, token, 'tutor');
      await sendTutorRegistrationReceipt(tutorData);
    } catch (e) { console.warn("Email Error", e); }

    res.status(200).send({ message: "Registration successful. Verify email.", tutorData });
  } catch (error) {
    console.error("❌ [TUTOR] Registration error:", error);
    res.status(500).send({ message: error.message });
  }
};


exports.approveTutor = async (req, res) => {
  const { tutorId } = req.body;
  try {
    const userRef = doc(db, 'users', tutorId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists) return res.status(404).send({ message: "Tutor not found" });

    const tutorData = userSnap.data();
    const updatePayload = { status: 'approved', approvedAt: serverTimestamp(), activated: false };
    await updateDoc(userRef, updatePayload);

    const token = await generateVerificationToken(tutorId, 'tutor');
    await sendApprovalEmail({ ...tutorData, uid: tutorId }, token);

    res.status(200).send({ message: "Tutor approved successfully." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.rejectTutor = async (req, res) => {
  const { tutorId, feedback } = req.body;
  try {
    const userRef = doc(db, 'users', tutorId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists) return res.status(404).send({ message: "Tutor not found" });

    const reason = feedback || 'Verification failed.';
    await updateDoc(userRef, { 
      status: 'rejected', 
      rejectionReason: reason, 
      rejectedAt: serverTimestamp() 
    });

    console.log(`🚫 [TUTOR] Rejecting tutor ${tutorId}. Reason: ${reason}`);
    const tutorData = userSnap.data();
    const tutorEmail = tutorData.email || tutorData.userEmail || tutorData.mail;

    console.log(`🚫 [TUTOR] Rejecting tutor ${tutorId}. Reason: ${reason}. Target Email: ${tutorEmail}`);
    
    if (!tutorEmail) {
      console.error(`❌ [TUTOR] Could not send rejection email: No email found for tutor ${tutorId}`);
    } else {
      const emailResult = await sendRejectionEmail({ ...tutorData, email: tutorEmail }, reason);
      if (emailResult && !emailResult.success) {
        console.error(`❌ [TUTOR] Rejection email delivery failed for ${tutorId}:`, emailResult.error);
      } else {
        console.log(`✅ [TUTOR] Rejection email sent successfully to ${tutorEmail}`);
      }
    }
    console.log(`✅ [TUTOR] Rejection email sent attempt for ${tutorId}`);
    res.status(200).send({ message: "Tutor rejected." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.updateKYC = async (req, res) => {
  const { tutorId } = req.body;
  console.log("📥 [KYC] Received update request for tutor:", tutorId);
  if (!tutorId) {
    return res.status(400).send({ message: "Missing tutorId." });
  }

  try {
    const fileURLs = {};
    const files = req.files;
    
    if (files) {
      const profileFile = files['profileImage']?.[0] || files['avatar']?.[0];
      if (profileFile) fileURLs.profilePic = fileURLs.avatar = await handleFileUpload(profileFile, req);
      
      const idFile = files['idProof']?.[0] || files['identityProof']?.[0];
      if (idFile) fileURLs.identityPic = fileURLs.identityProof = await handleFileUpload(idFile, req);
      
      const qualFile = files['qualificationDocs']?.[0] || files['degreeCertificate']?.[0];
      if (qualFile) fileURLs.educationCert = fileURLs.degreeCertificate = await handleFileUpload(qualFile, req);
      
      const expFile = files['experienceDocs']?.[0] || files['experienceCertificate']?.[0];
      if (expFile) fileURLs.experienceCert = fileURLs.experienceCertificate = await handleFileUpload(expFile, req);
      
      const demoFile = files['demoVideo']?.[0] || files['videoURL']?.[0];
      if (demoFile) fileURLs.demoVideo = fileURLs.videoURL = await handleFileUpload(demoFile, req);
    }

    const updateData = {
      ...fileURLs,
      status: 'pending',
      updatedAt: serverTimestamp()
    };

    // Ensure documents object is also updated for compatibility
    if (Object.keys(fileURLs).length > 0) {
      const userRef = doc(db, 'users', tutorId);
      const userSnap = await getDoc(userRef);
      const currentDocs = userSnap.exists ? (userSnap.data().documents || {}) : {};

      updateData.documents = {
        ...currentDocs,
        profileImage: fileURLs.profileImage || fileURLs.profilePic || fileURLs.avatar || currentDocs.profileImage || '',
        identityProof: fileURLs.identityProof || fileURLs.identityPic || currentDocs.identityProof || '',
        degreeCertificate: fileURLs.degreeCertificate || fileURLs.educationCert || currentDocs.degreeCertificate || '',
        experienceCertificate: fileURLs.experienceCertificate || fileURLs.experienceCert || currentDocs.experienceCertificate || '',
        demoVideo: fileURLs.demoVideo || fileURLs.videoURL || currentDocs.demoVideo || '',
        educationCert: fileURLs.educationCert || fileURLs.degreeCertificate || currentDocs.educationCert || '',
        identityPic: fileURLs.identityPic || fileURLs.identityProof || currentDocs.identityPic || '',
        profilePic: fileURLs.profilePic || fileURLs.profileImage || fileURLs.avatar || currentDocs.profilePic || ''
      };
    }

    await updateDoc(doc(db, 'users', tutorId), updateData);
    
    res.status(200).send({ message: "KYC documents updated successfully.", updateData });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.handleAdminTutorAction = async (req, res) => {
  const { tutorId, action, reason } = req.body;
  console.log(`📥 [ADMIN ACTION] Received ${action} request for tutor: ${tutorId}`);

  try {
    const userRef = doc(db, 'users', tutorId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists) return res.status(404).send({ message: "Tutor not found" });

    const tutorData = userSnap.data();
    const email = tutorData.email || tutorData.userEmail || tutorData.mail;

    if (!email) {
      console.warn(`⚠️ [ADMIN ACTION] No email found for tutor: ${tutorId}`);
      return res.status(200).send({ message: "Action logged, but no email address found to notify tutor." });
    }

    if (action === 'approve') {
      const token = await generateVerificationToken(tutorId, 'tutor');
      await sendApprovalEmail({ ...tutorData, email }, token);
      console.log(`✅ [ADMIN ACTION] Approval email sent to ${email}`);
    } else if (action === 'reject') {
      await sendRejectionEmail({ ...tutorData, email }, reason || 'Requirements not met.');
      console.log(`✅ [ADMIN ACTION] Rejection email sent to ${email}`);
    }

    res.status(200).send({ message: `Tutor ${action}ed and notified successfully.` });
  } catch (error) {
    console.error(`❌ [ADMIN ACTION] Error:`, error);
    res.status(500).send({ message: error.message });
  }
};
