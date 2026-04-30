const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function testConnection() {
  console.log("🧪 Testing SMTP Connection...");
  console.log(`👤 Using User: ${process.env.EMAIL_USER}`);
  
  try {
    await transporter.verify();
    console.log("✅ SMTP Connection is valid!");
  } catch (error) {
    console.error("❌ SMTP Verification Failed:");
    console.error(error.message);
    
    if (process.env.EMAIL_USER.includes('your-email')) {
      console.log("\n💡 RESOLUTION: You are still using placeholders in .env. Replace them with real credentials.");
    } else {
      console.log("\n💡 RESOLUTION: Check your App Password or Firewall settings.");
    }
  }
  process.exit();
}

testConnection();
