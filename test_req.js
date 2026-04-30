const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const crypto = require('crypto');

async function testRegistration() {
  try {
    const form = new FormData();
    const uniqueId = crypto.randomUUID();
    
    // Add text fields
    form.append('tutorId', uniqueId);
    form.append('name', 'Cloudinary Test Tutor');
    form.append('email', `cloudtest_${Date.now()}@eduqra.com`);
    form.append('phone', '9999999999');
    form.append('qualification', 'M.Sc Cloudinary Testing');
    form.append('experience', '3-5 Years');
    form.append('password', 'CloudPass!123');

    // Add files
    form.append('profileImage', fs.createReadStream('./dummy.jpg'));
    form.append('idProof', fs.createReadStream('./dummy.jpg'));
    form.append('qualificationDocs', fs.createReadStream('./dummy.pdf'));
    form.append('experienceDocs', fs.createReadStream('./dummy.pdf'));
    // sending small jpg inside demoVideo to avoid heavy processing
    form.append('demoVideo', fs.createReadStream('./dummy.jpg'), { filename: 'dummy.mp4' });

    console.log('Sending request to /api/register-tutor...');
    const response = await axios.post('http://localhost:5001/api/register-tutor', form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log('Registration Success:', response.data);
  } catch (error) {
    console.error('Registration Failed:', error.response?.data || error.message);
  }
}

testRegistration();
