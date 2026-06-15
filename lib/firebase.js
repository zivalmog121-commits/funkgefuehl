import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1U50PViJvLvMS7sLVOzwmShcR-JZcZ3Y",
  authDomain: "funkgefuehl.firebaseapp.com",
  projectId: "funkgefuehl",
  storageBucket: "funkgefuehl.firebasestorage.app",
  messagingSenderId: "80069537405",
  appId: "1:80069537405:web:86f7c3dcbe9c4a3553cb14",
  measurementId: "G-1ME5KWJV3J"
};

let app, auth, db, googleProvider;

if (typeof window !== "undefined") {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
}

export { app, auth, db, googleProvider };
