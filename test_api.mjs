
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testRegistration() {
  console.log("Testing Registration API...");
  
  const form = new FormData();
  form.append('tutorId', 'test-tutor-' + Date.now());
  form.append('name', 'Test Tutor');
  form.append('email', 'test_' + Date.now() + '@example.com');
  form.append('phone', '1234567890');
  form.append('qualification', 'B.Tech');
  form.append('experience', '1-3 Years');
  form.append('targetClasses', 'Primary (1-5)');
  
  // Create a dummy file for testing
  const dummyFilePath = path.join(process.cwd(), 'dummy.txt');
  fs.writeFileSync(dummyFilePath, 'dummy content for testing');
  
  form.append('profileImage', fs.createReadStream(dummyFilePath));
  form.append('idProof', fs.createReadStream(dummyFilePath));
  form.append('qualificationDocs', fs.createReadStream(dummyFilePath));
  form.append('experienceDocs', fs.createReadStream(dummyFilePath));
  form.append('demoVideo', fs.createReadStream(dummyFilePath));

  try {
    const response = await fetch('http://localhost:5001/api/register-tutor', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });
    
    const data = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response Data:", JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log("✅ Registration API test PASSED");
    } else {
      console.log("❌ Registration API test FAILED");
    }
  } catch (error) {
    console.error("❌ Request Error:", error.message);
  } finally {
    if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
  }
}

testRegistration();
