import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { onAuthStateChange } from '../lib/firebase';
import { syncStateToFirebase, loadStateFromFirebase, listenToStateChanges } from '../lib/firebaseSync';

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Register service worker for PWA functionality
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed, app still works without it
      });
    }
  }, []);

  useEffect(() => {
    // Listen to auth state
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser);
      
      if (authUser) {
        // Load state from Firebase when user signs in
        loadStateFromFirebase().then((cloudState) => {
          if (cloudState) {
            localStorage.setItem('funkgefuehl:state', JSON.stringify(cloudState));
          }
        });
        
        // Listen for real-time updates from Firebase
        const unsubscribeListener = listenToStateChanges(authUser.uid, (cloudState) => {
          localStorage.setItem('funkgefuehl:state', JSON.stringify(cloudState));
          // Dispatch event so pages know to reload state
          window.dispatchEvent(new Event('syncedFromCloud'));
        });
        
        return () => unsubscribeListener();
      }
    });
    return () => unsubscribe();
  }, []);

  return <Component {...pageProps} />;
}
