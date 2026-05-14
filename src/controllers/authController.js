const { db, admin, doc, getDoc, updateDoc, setDoc, serverTimestamp, collection, query, where, getDocs } = require('../config/firebase');
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
      status: role === 'student' ? 'active' : (currentStatus === 'approved' ? 'approved' : 'pending'),
      activated: true
    };

    await updateDoc(userRef, updatePayload);
    
    const loginUrl = role === 'tutor' 
      ? (process.env.TUTOR_LOGIN_URL || 'http://localhost:3001')
      : (process.env.STUDENT_LOGIN_URL || 'http://localhost:3006/login');
    
    console.log(`✅ [AUTH] Verifying ${role} ${tokenData.userId}. Redirecting to: ${loginUrl}`);
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

exports.sendVerification = async (req, res) => {
  const { userId, email, name, role } = req.body;
  if (!userId || !email) return res.status(400).send({ message: "Missing required fields" });

  try {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const { sendVerificationEmail } = require('../../emailService');

    await setDoc(doc(db, 'verificationTokens', hashedToken), {
      userId, role: role || 'student', expiresAt, usedAt: null, createdAt: serverTimestamp()
    });

    await sendVerificationEmail(email, name || 'User', token, role || 'student');
    res.status(200).send({ message: "Verification link sent." });
  } catch (error) {
    console.error("Resend Verification Error:", error);
    res.status(500).send({ message: error.message });
  }
};
