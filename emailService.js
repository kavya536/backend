const nodemailer = require('nodemailer');
require('dotenv').config();

// DETAILED LOGGER HELPERS
const logSuccess = (to, msg) => console.log('\x1b[32m%s\x1b[0m', `✅ [SMTP] ${to}: ${msg}`);
const logError = (to, err) => console.error('\x1b[31m%s\x1b[0m', `❌ [SMTP] ${to}: ${err}`);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '', 
  },
});

transporter.verify((error, success) => {
  if (error) {
    if (process.env.EMAIL_USER && process.env.EMAIL_USER.includes('your-email')) {
      console.warn("\x1b[33m%s\x1b[0m", "⚠️ WARNING: Placeholder email credentials in .env. SMTP will not work.");
    } else {
      logError("SYSTEM", `SMTP Connection failed: ${error.message}`);
    }
  } else {
    logSuccess("SYSTEM", "Email server is ready to send notifications.");
  }
});

async function sendEmail(to, subject, text, html) {
  try {
    const info = await transporter.sendMail({
      from: `"Eduqra Team" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    logSuccess(to, `Sent [${subject}]`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logError(to, `Delivery Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/** 
 * 1. Tutor Registration Success (Richer Content)
 */
async function sendTutorRegistrationReceipt(user) {
  if (!user.email) return;
  const subject = "Welcome to the Eduqra Teaching Network! – Profile Received";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; padding: 40px 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Registration Successful</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">Thank you for your interest in joining the Eduqra global teaching network. We have successfully received your registration application and all supporting documentation.</p>
          
          <div style="margin: 30px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px;">
            <p style="margin: 0 0 15px 0; color: #4f46e5; font-weight: 700; font-size: 14px; text-transform: uppercase;">Professional Review Timeline</p>
            <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Our academic review board will evaluate your teaching demo and verify your credentials within <strong>24 hours</strong>.</p>
            <p style="font-size: 14px; color: #64748b;">You will receive a follow-up email precisely at your registered address once the verification phase is complete.</p>
          </div>

          <p style="font-size: 14px; color: #475569; margin-bottom: 30px;">Once approved, you will gain access to your specialized dashboard to set your availability and begin interacting with students from around the globe.</p>
          
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 30px;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; font-weight: 500;">Eduqra Learning Technologies • Empowering Global Educators</p>
        </div>
      </div>
    </div>
  `;
  return sendEmail(user.email, subject, "Registration Under Review", html);
}

/** 
 * 2. Tutor Approved (With Magic Link Activation)
 */
async function sendApprovalEmail(user, token) {
  if (!user.email) return;
  const subject = "🎉 Verification Complete – Your Eduqra Journey Starts Now";
  
  // Magic Link for Approval (Using the unified verification endpoint)
  const activationLink = `http://localhost:5001/api/auth/verify?token=${token}&role=tutor`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0fdf4; padding: 40px 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Application Approved</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">Excellent news! After a thorough review of your demo session and professional records, your account has been <strong>successfully verified</strong> by our administration team.</p>
          
          <div style="margin: 35px 0; text-align: center;">
            <p style="font-size: 14px; color: #065f46; font-weight: 700; margin-bottom: 15px;">MANDATORY ACTIVATION REQUIRED:</p>
            <a href="${activationLink}" style="display: inline-block; background: #059669; color: #ffffff; padding: 18px 40px; border-radius: 12px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);">Activate My Dashboard</a>
            <p style="font-size: 12px; color: #6b7280; margin-top: 15px;">Please click the button above to verify your identity and enable your account access for the first time.</p>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 25px;">
            <p style="margin: 0 0 15px 0; color: #92400e; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">🚀 Mandatory Setup Steps:</p>
            <ul style="color: #b45309; font-size: 14px; padding-left: 20px; margin: 0; line-height: 2;">
              <li><strong>Update Detailed Profile:</strong> Add your educational background.</li>
              <li><strong>Configure Payouts:</strong> Add your <strong>UPI ID</strong> for automated earnings.</li>
              <li><strong>Set Tuition Fee:</strong> Choose <strong>Per Subject Cost</strong>.</li>
            </ul>
          </div>
          
          <p style="font-size: 14px; color: #475569; margin-top: 30px; text-align: center;">Welcome to the family. Let's make learning better together!</p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">Eduqra Learning Technologies • Verification Department</p>
        </div>
      </div>
    </div>
  `;
  return sendEmail(user.email, subject, "Account Verified!", html);
}

/** 
 * 3. Tutor Rejected (Inspiring & Detailed)
 */
async function sendRejectionEmail(user, feedback) {
  if (!user.email) return;
  const subject = "Verification Feedback – Path Forward at Eduqra";
  const reapplyLink = (process.env.REAPPLY_URL || "http://127.0.0.1:3001/login?reapply=true&email=") + encodeURIComponent(user.email);
  console.log(`[SMTP] Generated re-apply link: ${reapplyLink}`);
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdf2f2; padding: 40px 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Application Update</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">Thank you for sharing your experience with us. After reviewing your submission, our team has identified specific areas that require adjustment before we can finalize your onboarding.</p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 25px; margin: 30px 0;">
            <p style="margin: 0 0 10px 0; color: #b91c1c; font-weight: 800; font-size: 12px; text-transform: uppercase;">Administrative Feedback:</p>
            <p style="color: #991b1b; margin: 0; font-size: 15px; font-weight: 500; line-height: 1.5;">${feedback || "Please ensure your identification documents are clear and your teaching demo is performed in a quiet environment."}</p>
          </div>

          <p style="font-size: 16px; line-height: 1.6; color: #475569; font-weight: 700; font-style: italic; text-align: center; margin-bottom: 25px;">"Every expert was once a beginner. We believe in your potential to succeed!"</p>
          
          <p style="font-size: 15px; color: #475569; margin-bottom: 30px; text-align: center;">We encourage you to update your profile with the requested changes and <strong>re-apply now</strong>. Your professional journey is just a few corrections away.</p>

          <div style="text-align: center; margin-bottom: 40px;">
            <a href="${reapplyLink}" style="display: inline-block; background: #111827; color: #ffffff; padding: 18px 40px; border-radius: 12px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 14px rgba(0,0,0,0.1);">Update & Re-apply Now</a>
          </div>
          
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Note: This is not a final rejection. It is an invitation to improve and join our growing community.</p>
        </div>
      </div>
    </div>
  `;
  return sendEmail(user.email, subject, "Action Required", html);
}

/** 
 * 4. Student Registration (Detailed & Welcoming)
 */
async function sendWelcomeEmail(to, name) {
  const subject = "Welcome to EduqraHub – Your Academic Transformation Begins!";
  const loginLink = process.env.STUDENT_LOGIN_URL || "http://localhost:3006/login";
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Welcome Aboard!</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">Welcome to the Eduqra Student Hub! We are thrilled to partner with you on your academic journey. Our platform is designed to connect you with world-class tutors who can help you unlock your full potential.</p>
          
          <div style="margin: 35px 0; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 25px;">
            <p style="margin: 0 0 15px 0; color: #1d4ed8; font-weight: 800; font-size: 14px; text-transform: uppercase;">Unlock Your Potential:</p>
            <ul style="color: #1e40af; font-size: 15px; padding-left: 20px; list-style-type: '🚀 '; line-height: 2;">
              <li><strong>Gain Specialized Knowledge:</strong> Master complex topics with curated study materials.</li>
              <li><strong>1-on-1 Sessions:</strong> Experience personalized teaching tailored to your pace.</li>
              <li><strong>Instant Doubt Clarification:</strong> Reach out to experts whenever you're stuck.</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 40px;">
            <a href="${loginLink}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 18px 45px; border-radius: 14px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);">Login to Your Hub</a>
          </div>

          <p style="font-size: 14px; color: #64748b; margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 25px;">Explore thousands of expert tutors and book your first session today!</p>
        </div>
      </div>
    </div>
  `;
  return sendEmail(to, subject, "Welcome to Eduqra!", html);
}

/** 
 * 5. Admin Login Notification (Professional & Secure)
 */
async function sendAdminLoginEmail(to) {
  const subject = "Security Alert: Admin System Access – Eduqra Platform";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; padding: 40px 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 40px rgba(0,0,0,0.3);">
        <div style="background-color: #1e293b; padding: 25px; text-align: center; border-bottom: 4px solid #4f46e5;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Administrator Access</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Hello <strong>Admin</strong>,</p>
          <p style="font-size: 15px; color: #64748b; line-height: 1.6;">A successful sign-in has been detected for your administrative account. You now have full authorized access to the platform's control architecture.</p>
          
          <div style="margin: 35px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px;">
            <p style="margin: 0 0 15px 0; color: #1e293b; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">🔐 Active Session Summary:</p>
            <ul style="color: #475569; font-size: 14px; padding-left: 20px; line-height: 2;">
              <li>Monitor global user data and records.</li>
              <li>Oversee real-time payments and accounting.</li>
              <li>Moderate platform reviews and feedback.</li>
              <li>Coordinate verified tutor onboarding.</li>
            </ul>
          </div>
          
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
            <p style="margin: 0; color: #991b1b; font-size: 12px; font-weight: 600;">⚠️ Not You? If you did not perform this login, please contact the security department and reset your credentials immediately.</p>
          </div>
          
          <p style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 25px;">Automated Security Notification • Eduqra Admin Systems</p>
        </div>
      </div>
    </div>
  `;
  return sendEmail(to, subject, "Admin Security Alert", html);
}

/** 
 * 6. Booking Confirmation Email (3-4 lines format per request)
 */
async function sendBookingConfirmationEmail(booking) {
  if (!booking.studentEmail) return;
  const subject = `Your Booking is Confirmed! – ${booking.subject} with ${booking.tutorName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.5;">
      <p>Hello <strong>${booking.studentName}</strong>,</p>
      <p>Great news! Your booking is confirmed. You are starting learning for <strong>${booking.subject}</strong></p>
      <p>Your session with <strong>${booking.tutorName}</strong> is scheduled for <strong>${booking.date}</strong> at <strong>${booking.time}</strong>.</p>
      <p>Get ready to achieve your goals. See you in class!</p>
      <br />
      <p>Best regards,<br/>Eduqra Team</p>
    </div>
  `;
  return sendEmail(booking.studentEmail, subject, "Booking Confirmed", html);
}

/**
 * 7. Password Reset Email (Professional & Clean)
 */
async function sendPasswordResetEmail(email, resetLink) {
  const subject = "Reset Your Eduqra Password";
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #142B23 0%, #1e3f34 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Secure Password Recovery</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Hello,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">We received a request to reset the password for your Eduqra account. To proceed, please click the secure link below:</p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${resetLink}" style="display: inline-block; background: #142B23; color: #ffffff; padding: 18px 45px; border-radius: 14px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 14px rgba(20, 43, 35, 0.3);">Set New Password</a>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
             <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">🔒 Security Note: This link will expire in 1 hour. If you did not request this change, please ignore this email or contact support if you have concerns.</p>
          </div>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 30px;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; font-weight: 500;">Eduqra Learning Technologies • Security Team</p>
        </div>
      </div>
    </div>
  `;
  return sendEmail(email, subject, "Password Reset", html);
}

/**
 * 8. Email Verification (First-Time Registration)
 */
async function sendVerificationEmail(email, name, token, role = 'student') {
  const subject = "Verify Your Eduqra Account – Final Step";
  const verifyLink = `http://localhost:5001/api/auth/verify?token=${token}&role=${role}`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Verify Your Email</h1>
        </div>
        <div style="padding: 40px;">
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">Hello <strong>${name || 'User'}</strong>,</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">Welcome to Eduqra! To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${verifyLink}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 18px 45px; border-radius: 14px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);">Verify Email Address</a>
          </div>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
             <p style="margin: 0; color: #1e40af; font-size: 13px; font-weight: 600;">🔒 Security Note: This verification link is valid for 30 minutes and can only be used once. After verifying, you will be redirected to the login page to access your dashboard.</p>
          </div>

          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin-bottom: 30px;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; font-weight: 500;">Eduqra Learning Technologies • Security Team</p>
        </div>
      </div>
    </div>
  `;
  return sendEmail(email, subject, "Verify Your Email", html);
}

module.exports = { 
  sendEmail, 
  sendApprovalEmail, 
  sendRejectionEmail, 
  sendWelcomeEmail, 
  sendTutorRegistrationReceipt,
  sendAdminLoginEmail,
  sendBookingConfirmationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail
};
