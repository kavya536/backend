const admin = require('firebase-admin');
console.log('admin version:', require('firebase-admin/package.json').version);
const snap = { exists: true };
try {
  console.log('snap.exists():', typeof snap.exists === 'function' ? snap.exists() : 'not a function');
} catch (e) {
  console.log('snap.exists() threw error');
}
