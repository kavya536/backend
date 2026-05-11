const { db, admin, doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } = require('../config/firebase');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../../emailService');

exports.verifyEmail = async (req, res) => {
  const { token, role } = req.query;
  if (!token) return res.status(400).send("Token missing.");

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRef = doc(db, 'verificationTokens', hashedToken);
    const tokenSnap = await getDoc(tokenRef);

    if (!tokenSnap.exists || tokenSnap.data().usedAt) return res.status(400).send("Invalid/Expired link.");
    
    const tokenData = tokenSnap.data();
    await updateDoc(tokenRef, { usedAt: serverTimestamp() });

    const userRef = doc(db, 'users', tokenData.userId);
    const userSnap = await getDoc(userRef);
    const currentStatus = userSnap.exists ? userSnap.data().status : 'pending';

    const updatePayload = {
      email_verified: true,
      status: (role === 'tutor' && currentStatus !== 'approved') ? 'pending' : 'active',
      activated: (role === 'tutor' && currentStatus === 'approved') ? true : false
    };

    await updateDoc(userRef, updatePayload);
    
    const loginUrl = role === 'tutor' 
      ? 'https://eduqra-tutor-dashboard.web.app/login?verified=true'
      : 'https://eduqra-student-hub.web.app/login?verified=true';
    
    res.redirect(loginUrl);
  } catch (error) {
    res.status(500).send("Verification error.");
  }
};

exports.resetPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send({ message: "Email required" });

  try {
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    await sendPasswordResetEmail(email, resetLink);
    res.status(200).send({ message: "Reset link sent." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
