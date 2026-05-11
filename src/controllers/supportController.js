const { 
  db, doc, getDoc, updateDoc, serverTimestamp 
} = require('../config/firebase');
const { sendInquiryResponseEmail } = require('../../emailService');

exports.respondToInquiry = async (req, res) => {
  const { queryId, adminResponse } = req.body;
  
  if (!queryId || !adminResponse) {
    return res.status(400).send({ message: "Missing inquiry details or response." });
  }

  try {
    console.log(`[Support] Responding to query: ${queryId}`);
    const queryRef = doc(db, 'landing_queries', queryId);
    const querySnap = await getDoc(queryRef);
    
    // Robust check for both property (Admin SDK) and function (Client SDK)
    const isExisting = (typeof querySnap.exists === 'function') ? querySnap.exists() : querySnap.exists;
    if (!isExisting) {
      console.error(`[Support] Inquiry ${queryId} not found`);
      return res.status(404).send({ message: "Inquiry not found." });
    }

    const queryData = querySnap.data();
    console.log(`[Support] Found query from: ${queryData.email}`);

    // 1. Update Firestore
    await updateDoc(queryRef, {
      adminResponse: adminResponse,
      status: 'responded',
      respondedAt: serverTimestamp()
    });

    // 2. Send Email
    try {
      console.log(`[Support] Sending email to ${queryData.email}`);
      await sendInquiryResponseEmail(queryData, adminResponse);
    } catch (e) {
      console.warn("[Support] Email delivery failed, but record updated.", e);
    }

    res.status(200).send({ 
      message: "Response sent successfully.",
      updatedQuery: { id: queryId, ...queryData, adminResponse, status: 'responded' }
    });
  } catch (error) {
    console.error("Error in respondToInquiry:", error);
    res.status(500).send({ message: "Server error: " + error.message });
  }
};
