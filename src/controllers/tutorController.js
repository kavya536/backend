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
  if (!tutorId || !email) {
    return res.status(400).send({ message: "Missing required tutor details." });
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
      documents: {
        profileImage: fileURLs.profilePic || fileURLs.avatar || '',
        identityProof: fileURLs.identityPic || fileURLs.identityProof || '',
        degreeCertificate: fileURLs.educationCert || fileURLs.degreeCertificate || '',
        experienceCertificate: fileURLs.experienceCert || fileURLs.experienceCertificate || '',
        demoVideo: fileURLs.demoVideo || fileURLs.videoURL || ''
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
    res.status(500).send({ message: error.message });
  }
};

exports.approveTutor = async (req, res) => {
  const { tutorId } = req.body;
  try {
    const userRef = doc(db, 'users', tutorId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).send({ message: "Tutor not found" });

    const tutorData = userSnap.data();
    const updatePayload = { status: 'approved', approvedAt: serverTimestamp(), activated: false };
    
    await updateDoc(userRef, updatePayload);
    await setDoc(doc(db, 'tutors', tutorId), { ...tutorData, ...updatePayload }, { merge: true });

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
    if (!userSnap.exists()) return res.status(404).send({ message: "Tutor not found" });

    const reason = feedback || 'Verification failed.';
    await updateDoc(userRef, { status: 'rejected', rejectionReason: reason, rejectedAt: serverTimestamp() });
    
    await setDoc(doc(db, 'rejectedProfiles', tutorId), {
      ...userSnap.data(),
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: serverTimestamp()
    });

    await sendRejectionEmail(userSnap.data(), reason);
    res.status(200).send({ message: "Tutor rejected." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
