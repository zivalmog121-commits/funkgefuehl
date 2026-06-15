import { db, auth } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

const COLLECTION = "userState";

export async function syncStateToFirebase(state) {
  if (!auth?.currentUser) return false;
  try {
    const userRef = doc(db, COLLECTION, auth.currentUser.uid);
    await setDoc(userRef, {
      ...state,
      syncedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Sync error:", error);
    return false;
  }
}

export async function loadStateFromFirebase() {
  if (!auth?.currentUser) return null;
  try {
    const userRef = doc(db, COLLECTION, auth.currentUser.uid);
    const snapshot = await getDoc(userRef);
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.error("Load error:", error);
    return null;
  }
}

export function listenToStateChanges(userId, callback) {
  if (!userId) return () => {};
  const userRef = doc(db, COLLECTION, userId);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  });
}
