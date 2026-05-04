import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const firebaseConfig = {
  apiKey: "AIzaSyDwXgG11d-FJc1IkRLs9_H7tR6NBIKXDbw",
  authDomain: "tutor-website-c532a.firebaseapp.com",
  projectId: "tutor-website-c532a",
  storageBucket: "tutor-website-c532a.firebasestorage.app",
  messagingSenderId: "925264880105",
  appId: "1:925264880105:web:59a1d97951995179466b78"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
    console.log("🚀 STARTING MIGRATION: Local Files -> Cloudinary...");
    const uploadsDir = path.join(__dirname, 'uploads');

    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`Checking ${usersSnap.size} profiles...`);

    for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();
        let needsUpdate = false;
        const updatedData = { ...data };

        // Check for localhost URLs in documents and top-level fields
        const fieldsToCheck = [
            'profilePic', 'avatar', 'identityPic', 'identityProof', 
            'educationCert', 'degreeCertificate', 'experienceCert', 
            'experienceCertificate', 'demoVideo', 'videoURL'
        ];

        // Check top level
        for (const field of fieldsToCheck) {
            if (data[field] && typeof data[field] === 'string' && data[field].includes('localhost')) {
                const newUrl = await uploadLocalFile(data[field], uploadsDir);
                if (newUrl) {
                    updatedData[field] = newUrl;
                    needsUpdate = true;
                }
            }
        }

        // Check nested documents
        if (data.documents) {
            updatedData.documents = { ...data.documents };
            for (const key of Object.keys(data.documents)) {
                if (data.documents[key] && data.documents[key].includes('localhost')) {
                    const newUrl = await uploadLocalFile(data.documents[key], uploadsDir);
                    if (newUrl) {
                        updatedData.documents[key] = newUrl;
                        needsUpdate = true;
                    }
                }
            }
        }

        if (needsUpdate) {
            console.log(`✅ Updating profile: ${data.name || data.email} (${userDoc.id})`);
            await updateDoc(doc(db, 'users', userDoc.id), updatedData);
            
            // Also sync to legacy 'tutors' if it exists
            const tutorRef = doc(db, 'tutors', userDoc.id);
            try {
                await updateDoc(tutorRef, updatedData);
            } catch (e) {}
        }
    }

    console.log("✨ MIGRATION COMPLETE!");
}

async function uploadLocalFile(localUrl, uploadsDir) {
    try {
        // Extract filename from URL (e.g., http://localhost:5001/uploads/filename.png -> filename.png)
        const filename = localUrl.split('/').pop();
        const filePath = path.join(uploadsDir, filename);

        if (fs.existsSync(filePath)) {
            console.log(`   📤 Uploading: ${filename}`);
            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'tutor_uploads',
                resource_type: 'auto'
            });
            return result.secure_url;
        } else {
            console.warn(`   ⚠️ File not found on disk: ${filename}`);
            return null;
        }
    } catch (err) {
        console.error(`   ❌ Failed to upload ${localUrl}:`, err.message);
        return null;
    }
}

migrate();
