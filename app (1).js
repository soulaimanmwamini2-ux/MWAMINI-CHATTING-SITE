import { db, auth } from "./auth.js";
import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, setDoc, deleteDoc, getDocs, Timestamp, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const App = {
    init() {
        this.renderGroups();
        this.cleanupExpiredStatuses();
    },
    async cleanupExpiredStatuses() {
        const cutoff = Timestamp.now().seconds - (259200); // 72 hours
        const q = query(collection(db, "statuses"), where("timestamp", "<", cutoff));
        (await getDocs(q)).forEach(d => deleteDoc(d.ref));
    },
    async createGroup(name) {
        await addDoc(collection(db, "groups"), { name, admin: auth.currentUser.uid, members: [auth.currentUser.uid] });
    },
    async addMember(groupId, email) {
        const snap = await getDocs(query(collection(db, "users"), where("email", "==", email)));
        if (!snap.empty) {
            await setDoc(doc(db, "groups", groupId), { members: arrayUnion(snap.docs[0].data().uid) }, { merge: true });
        }
    },
    renderGroups() {
        onSnapshot(query(collection(db, "groups"), where("members", "array-contains", auth.currentUser.uid)), (snap) => {
            const list = document.getElementById("groupList");
            list.innerHTML = "";
            snap.forEach(d => {
                const btn = document.createElement("button");
                btn.innerText = `# ${d.data().name}`;
                btn.onclick = () => window.activeGroupId = d.id;
                list.appendChild(btn);
            });
        });
    }
};
window.App = App;
