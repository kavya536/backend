const crypto = require('crypto');
const { recordBooking } = require('./bookingController');

exports.handleRazorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here';
  const signature = req.headers['x-razorpay-signature'];

  try {
    // 1. Verify Webhook Signature using raw body
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(req.rawBody || JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      console.warn("⚠️ [WEBHOOK] Invalid signature received.");
      return res.status(400).send({ message: "Invalid signature" });
    }

    console.log("✅ [WEBHOOK] Valid Razorpay Signature.");

    const event = req.body.event;
    const payload = req.body.payload.payment.entity;

    // 2. Handle 'payment.captured' event
    if (event === 'payment.captured') {
      const { notes, id: paymentId, amount, currency } = payload;
      
      // Notes should contain the booking metadata sent from the frontend
      // Expected: { studentId, tutorId, subject, date, time, studentEmail, tutorName }
      if (notes && notes.studentId) {
        console.log(`💳 [PAYMENT CAPTURED] Processing booking for ${notes.studentEmail}`);
        
        const bookingData = {
          bookingId: notes.bookingId || `WEBHOOK_${paymentId}`,
          paymentId: paymentId,
          amount: amount / 100, // Convert from paise to rupees
          currency: currency,
          ...notes
        };

        await recordBooking(bookingData, notes.studentId);
      } else {
        console.warn("⚠️ [WEBHOOK] Payment captured but no booking notes found.");
      }
    }

    // 3. Always return 200 to Razorpay immediately
    res.status(200).send({ status: 'ok' });
  } catch (error) {
    console.error("❌ [WEBHOOK ERROR]", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};
