import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged,
    signOut
}
from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

export const AuthEngine = {

    async register(email, password, username) {

        try {

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            await updateProfile(userCredential.user, {
                displayName: username
            });

            alert("Registration successful");

            window.location.href = "dashboard.html";

        } catch (error) {

            alert(error.message);

        }

    },

    async login(email, password) {

        try {

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            alert("Login successful");

            window.location.href = "dashboard.html";

        } catch (error) {

            alert(error.message);

        }

    },

    monitorState(callback) {

        onAuthStateChanged(auth, callback);

    },

    async logout() {

        await signOut(auth);

        window.location.href = "index.html";

    }

};
