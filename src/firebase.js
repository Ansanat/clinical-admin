// Инициализация Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Вставьте сюда свои данные из Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyCbq2k72aT2PmKx3kXFUTVTngvCz0SjQv0",
    authDomain: "clinical-admin-a46a5.firebaseapp.com",
    projectId: "clinical-admin-a46a5",
    storageBucket: "clinical-admin-a46a5.firebasestorage.app",
    messagingSenderId: "731406477688",
    appId: "1:731406477688:web:072487852deabf4cd8008d",
    measurementId: "G-PWHTRQTZCH"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, signInWithEmailAndPassword, signOut };
