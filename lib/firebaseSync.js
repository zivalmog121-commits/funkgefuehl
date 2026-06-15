import { db, auth } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

const FIRESTORE_COLLECTION = "users";

export async function syncStateToFirebase(state) {
  if (!auth || !auth.currentUser) return;
  
  const user = auth.currentUser;
  if (!user) return; // Not logged in

  try {
    const userRef = doc(db, FIRESTORE_COLLECTION, user.uid);
    await setDoc(userRef, {
      state,
      lastUpdated: new Date().toISOString(),
      email: user.email,
      displayName: user.displayName,
    });
  } catch (error) {
    console.error("Error syncing to Firebase:", error);
  }
}

export async function loadStateFromFirebase() {
  if (!auth || !auth.currentUser) return null;
  
  const user = auth.currentUser;
  if (!user) return null; // Not logged in

  try {
    const userRef = doc(db, FIRESTORE_COLLECTION, user.uid);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      return snapshot.data().state;
    }
  } catch (error) {
    console.error("Error loading from Firebase:", error);
  }
  return null;
}

export function listenToStateChanges(userId, callback) {
  if (!userId || !db) return () => {}; // Not logged in

  const userRef = doc(db, FIRESTORE_COLLECTION, userId);
  const unsubscribe = onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data().state);
    }
  });

  return unsubscribe;
}
