import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile,
    sendEmailVerification,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// 🚨 PASTE YOUR REAL FIREBASE KEYS HERE 🚨
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBiglIl9cO6Tf5p-cRB9kDZqpV2i4wliug",
  authDomain: "mwamini-chatting-site-38894.firebaseapp.com",
  databaseURL: "https://mwamini-chatting-site-38894-default-rtdb.firebaseio.com",
  projectId: "mwamini-chatting-site-38894",
  storageBucket: "mwamini-chatting-site-38894.firebasestorage.app",
  messagingSenderId: "522276815664",
  appId: "1:522276815664:web:debb043876b07cca913ef5",
  measurementId: "G-FKFP0J8J94"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const Auth = {
    async login(email, pass) {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        if (!userCredential.user.emailVerified) {
            await signOut(auth);
            throw new Error("Email verification required. Please verify your email first.");
        }
        location.href = "dashboard.html";
        return userCredential.user;
    },

    async register(email, pass, name) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(userCredential.user, { displayName: name });
        await sendEmailVerification(userCredential.user);
        await signOut(auth); 
        return true;
    },

    async loginAsGuest() {
        return signInAnonymously(auth);
    },

    logout() {
        return signOut(auth).then(() => {
            location.href = "index.html";
        });
    },

    onAuth(callback) {
        onAuthStateChanged(auth, callback);
    }
};
