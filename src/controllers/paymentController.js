const crypto = require('crypto');
const Razorpay = require('razorpay');
const { recordBooking, updateBookingStatus, logFailedPayment } = require('./bookingController');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, receipt, notes } = req.body;
    
    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency: "INR",
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {}
    };

    const order = await razorpay.orders.create(options);
    
    console.log(`📦 [RAZORPAY] Order Created: ${order.id} for ₹${amount}`);
    
    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error("❌ [RAZORPAY ORDER ERROR]", error);
    res.status(500).json({ 
      message: "Failed to create Razorpay order", 
      error: error.message || error 
    });
  }
};

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

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`✅ [WEBHOOK] Valid Signature. Event: ${event}`);

    // 2. Handle Events
    switch (event) {
      case 'payment.captured': {
        const payment = payload.payment.entity;
        const { notes, id: paymentId, amount, currency } = payment;
        
        if (notes && notes.studentId) {
          console.log(`💳 [PAYMENT CAPTURED] Processing booking for ${notes.studentEmail}`);
          const bookingData = {
            bookingId: notes.bookingId || `WEBHOOK_${paymentId}`,
            paymentId: paymentId,
            amount: amount / 100,
            currency: currency,
            ...notes
          };
          await recordBooking(bookingData, notes.studentId);
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment.entity;
        console.log(`❌ [PAYMENT FAILED] ID: ${payment.id}, Reason: ${payment.error_description}`);
        await logFailedPayment({
          paymentId: payment.id,
          amount: payment.amount / 100,
          error: payment.error_description,
          studentEmail: payment.email,
          notes: payment.notes
        });
        break;
      }

      case 'refund.processed': {
        const refund = payload.refund.entity;
        console.log(`↩️ [REFUND PROCESSED] ID: ${refund.id} for Payment: ${refund.payment_id}`);
        await updateBookingStatus(refund.payment_id, 'refunded', {
          refundId: refund.id,
          refundAmount: refund.amount / 100,
          refundStatus: refund.status
        });
        break;
      }

      default:
        console.log(`ℹ️ [WEBHOOK] Unhandled event type: ${event}`);
    }

    // 3. Always return 200 to Razorpay immediately
    res.status(200).send({ status: 'ok' });
  } catch (error) {
    console.error("❌ [WEBHOOK ERROR]", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};
