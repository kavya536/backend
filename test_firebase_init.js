const dotenv = require('dotenv');
dotenv.config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (!privateKey) {
    console.log('No key found');
    process.exit(1);
}

console.log('First 100 chars (escaped):', JSON.stringify(privateKey.substring(0, 100)));
console.log('Contains literal \\n:', privateKey.includes('\\n'));
console.log('Contains actual newline:', privateKey.includes('\n'));

const fixedKey = privateKey.split('\\n').join('\n');
console.log('Fixed length:', fixedKey.length);

try {
    const admin = require('firebase-admin');
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "tutor-website-c532a",
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: fixedKey
        })
    });
    console.log('✅ Initialization successful');
} catch (e) {
    console.error('❌ Failed:', e.message);
}
