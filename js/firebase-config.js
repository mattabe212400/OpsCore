// ══════════════════════════════════════════════
// firebase-config.js
// Handles Firebase initialization and demo mode detection.
// In demo mode (_IS_DEMO = true), Firebase is bypassed entirely.
// To connect a real project: set _IS_DEMO = false and fill in firebaseConfig.
// See: https://console.firebase.google.com → Project Settings → Your Apps
// ══════════════════════════════════════════════

const _IS_DEMO = true; // Set to false when using real Firebase credentials
window._IS_DEMO = _IS_DEMO; // expose globally so all script blocks can read it

if (_IS_DEMO) {
  // Signal immediately that we're ready (no Firebase needed)
  window._fbReady = true;
  window._fbAuth = null;
  window._fbDb = null;
  window._fbFns = null;
  window._firebaseConfirmed = true;
  document.dispatchEvent(new Event('firebase-ready'));
} else {
  // ── REAL FIREBASE CONFIG (replace placeholders) ──
  // Load Firebase dynamically only when _IS_DEMO = false
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
    import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
      from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
    import { getFirestore, doc, collection, getDocs, getDoc, setDoc, addDoc, updateDoc,
      deleteDoc, onSnapshot, query, orderBy, writeBatch, serverTimestamp }
      from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
    const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "your-project.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project.firebasestorage.app",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:0000000000000000000000"
    };
    const _app = initializeApp(firebaseConfig);
    window._fbAuth = getAuth(_app);
    window._fbDb = getFirestore(_app);
    window._fbFns = { signInWithEmailAndPassword, signOut, onAuthStateChanged,
      doc, collection, getDocs, getDoc, setDoc, addDoc, updateDoc,
      deleteDoc, onSnapshot, query, orderBy, writeBatch, serverTimestamp };
    window._fbReady = true;
    document.dispatchEvent(new Event('firebase-ready'));
  `;
  document.head.appendChild(script);
}
