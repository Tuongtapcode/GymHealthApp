import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAGlFgbfpc3zrbmQdEiH5Me8xYWw1mHFoc",
  authDomain: "gymappchat-817bf.firebaseapp.com",
  projectId: "gymappchat-817bf",
  storageBucket: "gymappchat-817bf.firebasestorage.app",
  messagingSenderId: "1066438600930",
  appId: "1:1066438600930:web:37654927f893b8734396bb",
  measurementId: "G-R18XVWL43G"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);