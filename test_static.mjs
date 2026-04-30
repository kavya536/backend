
import fetch from 'node-fetch';

async function testStaticFiles() {
  // We know this file exists from our previous list_dir
  const filename = 'profileImage-1776099971247.jpg'; 
  const url = `http://localhost:5001/uploads/${filename}`;
  
  console.log(`Testing static file access: ${url}`);
  
  try {
    const response = await fetch(url);
    console.log("Response Status:", response.status);
    if (response.ok) {
      console.log("✅ Static files are being served correctly!");
    } else {
      console.log("❌ Failed to serve static files.");
    }
  } catch (error) {
    console.error("❌ Request Error:", error.message);
  }
}

testStaticFiles();
