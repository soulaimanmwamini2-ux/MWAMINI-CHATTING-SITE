import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ===================================================
// ====== PASTE YOUR FIREBASE CONFIGURATION HERE ======
// ===================================================
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
// ===================================================

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const Auth = {
    login(email, pass) {
        return signInWithEmailAndPassword(auth, email, pass)
            .then(() => location.href = "dashboard.html")
            .catch(err => alert("Login Error: " + err.message));
    },

    register(email, pass, name) {
        return createUserWithEmailAndPassword(auth, email, pass)
            .then(async (userCred) => {
                await updateProfile(userCred.user, { displayName: name });
                location.href = "dashboard.html";
            })
            .catch(err => alert("Registration Error: " + err.message));
    },

    logout() {
        return signOut(auth).then(() => location.href = "index.html");
    },

    onAuth(callback) {
        onAuthStateChanged(auth, callback);
    }
};
