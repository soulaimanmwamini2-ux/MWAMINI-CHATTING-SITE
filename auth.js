/* auth.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// ====== FIREBASE CONFIGURATION ======
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
const auth = getAuth(app);
const db = getFirestore(app);

// ====== UI ELEMENTS ======
const loginTab = document.getElementById('tab-login');
const registerTab = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const alertBox = document.getElementById('alert-box');
const guestLoginBtn = document.getElementById('guest-login-btn');

// ====== EVENT LISTENERS ======
if(loginTab && registerTab) {
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });
}

const showAlert = (msg, isError = true) => {
    alertBox.textContent = msg;
    alertBox.className = isError ? 'alert error' : 'alert success';
    alertBox.classList.remove('hidden');
    setTimeout(() => alertBox.classList.add('hidden'), 5000);
};

if(registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCred.user);
            await setDoc(doc(db, "users", userCred.user.uid), {
                uid: userCred.user.uid,
                name: name,
                email: email.toLowerCase()
            });
            showAlert("Registration successful! Please verify your email before logging in.", false);
            auth.signOut();
        } catch (error) {
            showAlert(error.message);
        }
    });
}

if(loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            if (!userCred.user.emailVerified) {
                showAlert("Please verify your email first.");
                auth.signOut();
                return;
            }
            sessionStorage.removeItem('guestMode');
            window.location.href = 'dashboard.html';
        } catch (error) {
            showAlert(error.message);
        }
    });
}

if(guestLoginBtn) {
    guestLoginBtn.addEventListener('click', async () => {
        try {
            await signInAnonymously(auth);
            sessionStorage.setItem('guestMode', 'true');
            window.location.href = 'dashboard.html';
        } catch (error) {
            showAlert(error.message);
        }
    });
}

onAuthStateChanged(auth, (user) => {
    const isDashboard = window.location.pathname.includes('dashboard.html');
    if (user && !isDashboard) {
        if(user.isAnonymous || user.emailVerified) {
            window.location.href = 'dashboard.html';
        }
    }
});
