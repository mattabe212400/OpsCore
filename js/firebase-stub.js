/* OpsCore 2.0 Demo — Firebase stub (no real Firebase used) */
  // Stub out Firebase so the rest of the app code runs unchanged
  window._fbReady = true;
  window._fbAuth = { currentUser: null };
  window._fbDb = {};
  window._fbFns = {
    signInWithEmailAndPassword: async () => {},
    signOut: async () => {},
    onAuthStateChanged: (auth, cb) => { cb(null); return ()=>{}; },
    doc: () => ({}),
    collection: () => ({}),
    getDocs: async () => ({ forEach: ()=>{} }),
    getDoc: async () => ({ exists: ()=>false, data: ()=>({}) }),
    setDoc: async () => {},
    addDoc: async () => ({ id: 'demo' }),
    updateDoc: async () => {},
    deleteDoc: async () => {},
    onSnapshot: (ref, cb) => { return ()=>{}; },
    query: (...a) => ({}),
    orderBy: () => ({}),
    writeBatch: () => ({ set:()=>{}, commit: async ()=>{} }),
    serverTimestamp: () => new Date().toISOString(),
  };
  document.dispatchEvent(new Event('firebase-ready'));
