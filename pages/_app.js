import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Register service worker for PWA functionality
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Set up Firebase listener
    if (typeof window !== 'undefined') {
      import('../lib/firebase').then(({ onAuthStateChange }) => {
        const unsubscribe = onAuthStateChange((authUser) => {
          if (authUser) {
            // Load from Firebase when user signs in
            import('../lib/firebaseSync').then(({ loadStateFromFirebase, listenToStateChanges }) => {
              loadStateFromFirebase().then((cloudState) => {
                if (cloudState) {
                  localStorage.setItem('funkgefuehl:state', JSON.stringify(cloudState));
                  window.dispatchEvent(new Event('syncedFromCloud'));
                }
              });

              // Listen for real-time updates
              listenToStateChanges(authUser.uid, (cloudState) => {
                localStorage.setItem('funkgefuehl:state', JSON.stringify(cloudState));
                window.dispatchEvent(new Event('syncedFromCloud'));
              });
            });
          }
        });
        return () => unsubscribe();
      });
    }
  }, []);

  return <Component {...pageProps} />;
}
