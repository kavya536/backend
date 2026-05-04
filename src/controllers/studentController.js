const { db, doc, getDoc, setDoc, addDoc, collection, serverTimestamp } = require('../config/firebase');
const { sendVerificationEmail } = require('../../emailService');
const crypto = require('crypto');

const generateVerificationToken = async (userId, role) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await setDoc(doc(db, 'verificationTokens', hashedToken), {
    userId, role, expiresAt, usedAt: null, createdAt: serverTimestamp()
  });
  return token;
};

exports.registerStudent = async (req, res) => {
  const { studentId, name, email } = req.body;
  if (!studentId) return res.status(400).send({ message: "Missing studentId" });

  try {
    const studentRef = doc(db, 'students', studentId);
    let snap = await getDoc(studentRef);
    
    if (!snap.exists()) {
        const newStudent = {
            name: name || "Student",
            email: email || "",
            status: "EMAIL_NOT_VERIFIED", 
            email_verified: false,
            createdAt: serverTimestamp(),
        };
        await setDoc(studentRef, newStudent);
        await setDoc(doc(db, 'users', studentId), { ...newStudent, role: 'student' });

        await addDoc(collection(db, 'admin_notifications'), {
            type: 'Student Registration',
            title: 'New Student Registered',
            message: `${name || email} has joined.`,
            time: serverTimestamp(),
            read: false
        });
    }

    const token = await generateVerificationToken(studentId, 'student');
    await sendVerificationEmail(email, name, token, 'student');
    
    res.status(200).send({ message: "Student registered successfully." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
