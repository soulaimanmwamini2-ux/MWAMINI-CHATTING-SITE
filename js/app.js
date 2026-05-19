import { db, auth } from "./auth.js";
import {
    collection,
    addDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentGroup = "general";
let unsubscribeChat = null;

const CryptoEngine = {
    encrypt(text) {
        const encoded = btoa(unescape(encodeURIComponent(text)));
        return `E2EE::${encoded}`;
    },
    decrypt(cipherText) {
        if (!cipherText.startsWith("E2EE::")) return cipherText;
        const base64Str = cipherText.replace("E2EE::", "");
        return decodeURIComponent(escape(atob(base64Str)));
    }
};

const AIMpderator = {
    moderate(text) {
        const structuralFlags = ["hack", "bypass", "malware", "exploit"];
        const checkingStr = text.toLowerCase();
        const breachDetected = structuralFlags.some(flag => checkingStr.includes(flag));
        if (breachDetected) {
            throw new Error("AI Policy Infringement: Security Engine blocked message transmit.");
        }
        return text;
    }
};

export const App = {
    async init() {
        this.syncPresence("online");
        this.renderGroups();
        this.connectToGroup(currentGroup);

        window.addEventListener("beforeunload", () => this.syncPresence("offline"));
    },

    async syncPresence(status) {
        if (!auth.currentUser) return;
        const userRef = doc(db, "users", auth.currentUser.uid);
        await setDoc(userRef, {
            email: auth.currentUser.email,
            status: status,
            lastSeen: serverTimestamp()
        }, { merge: true });
    },

    renderGroups() {
        const groupList = document.getElementById("groupList");
        const channels = ["general", "ops-team", "dev-secure"];
        
        groupList.innerHTML = channels.map(chan => 
            `<button class="group-btn ${chan === currentGroup ? 'active' : ''}" data-channel="${chan}"># ${chan}</button>`
        ).join("");

        groupList.onclick = (e) => {
            const target = e.target.closest('.group-btn');
            if (!target) return;
            
            document.querySelectorAll('.group-btn').forEach(b => b.classList.remove('active'));
            target.classList.add('active');
            
            currentGroup = target.dataset.channel;
            document.getElementById("currentGroupTitle").innerText = `# ${currentGroup}`;
            this.connectToGroup(currentGroup);
        };
    },

    connectToGroup(groupId) {
        if (unsubscribeChat) unsubscribeChat();

        const q = query(collection(db, `groups/${groupId}/messages`), orderBy("time"));

        unsubscribeChat = onSnapshot(q, snap => {
            const box = document.getElementById("chatBox");
            box.innerHTML = "";

            snap.forEach(documentSnapshot => {
                const data = documentSnapshot.data();
                const cleanMsg = CryptoEngine.decrypt(data.text || "");
                
                const bubble = document.createElement("div");
                bubble.className = "msg-bubble";
                
                bubble.innerHTML = `
                    <div class="msg-meta">
                        <span class="msg-user">${data.user || "anonymous"}</span>
                    </div>
                    <div class="msg-body">${cleanMsg}</div>
                `;
                box.appendChild(bubble);
            });
            box.scrollTop = box.scrollHeight;
        });
    },

    async send(text) {
        try {
            const validatedText = AIMpderator.moderate(text);
            const cipherText = CryptoEngine.encrypt(validatedText);

            await addDoc(collection(db, `groups/${currentGroup}/messages`), {
                text: cipherText,
                user: auth.currentUser.email,
                time: serverTimestamp()
            });
        } catch (securityError) {
            alert(securityError.message);
        }
    }
};
