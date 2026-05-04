const { 
  db, doc, getDoc, updateDoc, setDoc, 
  collection, addDoc, serverTimestamp, increment, arrayUnion, query, where, getDocs 
} = require('../config/firebase');
const { sendBookingConfirmationEmail } = require('../../emailService');

/**
 * Shared logic for recording a booking
 * Can be called from Frontend (legacy) OR Webhook (new)
 */
const recordBooking = async (bookingData, studentId) => {
  try {
    const { bookingId, studentEmail, tutorId, tutorName, subject, date, time } = bookingData;
    
    // 1. Idempotency Check (Prevent duplicate bookings)
    const bookingRef = doc(db, 'bookings', bookingId || `BOK_${Date.now()}`);
    const existingSnap = await getDoc(bookingRef);
    if (existingSnap.exists()) {
      console.log(`⚠️ [BOOKING] Booking ${bookingId} already recorded. Skipping.`);
      return { success: true, message: "Duplicate" };
    }

    // 2. Record the Master Booking
    await setDoc(bookingRef, {
      ...bookingData,
      status: 'confirmed',
      createdAt: serverTimestamp()
    });

    // 3. Update Student History
    let sId = studentId;
    if (!sId && studentEmail) {
      const q = query(collection(db, 'students'), where('email', '==', studentEmail.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) sId = snap.docs[0].id;
    }

    if (sId) {
      const studentRef = doc(db, 'students', sId);
      await updateDoc(studentRef, {
        totalBookings: increment(1),
        lastBookingAt: serverTimestamp(),
        bookingsHistory: arrayUnion({
          ...bookingData,
          status: 'confirmed',
          timestamp: new Date().toISOString()
        })
      });
    }

    // 4. Send Confirmation Email
    await sendBookingConfirmationEmail(bookingData);

    console.log(`✅ [BOOKING SUCCESS] Recorded for ${studentEmail} with ${tutorName}`);
    return { success: true };
  } catch (error) {
    console.error("❌ [BOOKING ERROR]", error);
    throw error;
  }
};

exports.handleBookingSuccess = async (req, res) => {
  const { booking, studentId } = req.body;
  try {
    await recordBooking(booking, studentId);
    res.status(200).send({ message: "Booking processed successfully." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.recordBooking = recordBooking;
