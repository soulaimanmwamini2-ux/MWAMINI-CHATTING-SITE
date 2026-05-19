/* app.js */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

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

let currentUser = null;
let isGuest = false;
let activeChatType = null; // 'private' or 'group'
let activeChatId = null;
let activeChatName = null;
let unsubscribeMessages = null;

// ====== UI ELEMENTS ======
const logoutBtn = document.getElementById('logout-btn');
const currentUserNameLabel = document.getElementById('current-user-name');
const msgInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const activeChatNameLabel = document.getElementById('active-chat-name');
const inputArea = document.getElementById('chat-input-area');
const guestWarning = document.getElementById('guest-warning');
const groupActions = document.getElementById('group-actions');

const tabs = {
    chats: document.getElementById('tab-chats'),
    groups: document.getElementById('tab-groups'),
    status: document.getElementById('tab-status')
};
const panels = {
    chats: document.getElementById('panel-chats'),
    groups: document.getElementById('panel-groups'),
    status: document.getElementById('panel-status')
};

// ====== INIT & AUTH GUARD ======
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;
    isGuest = sessionStorage.getItem('guestMode') === 'true' || user.isAnonymous;
    
    if (isGuest) {
        currentUserNameLabel.textContent = "Guest User";
        guestWarning.classList.remove('hidden');
    } else {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            currentUserNameLabel.textContent = userDoc.data().name;
        }
    }
    
    setupUI();
    loadUsers();
    loadGroups();
    loadStatuses();
});

logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('guestMode');
    signOut(auth);
});

// ====== TAB NAVIGATION ======
Object.keys(tabs).forEach(key => {
    tabs[key].addEventListener('click', () => {
        Object.keys(tabs).forEach(k => tabs[k].classList.remove('active'));
        Object.keys(panels).forEach(k => panels[k].classList.add('hidden'));
        tabs[key].classList.add('active');
        panels[key].classList.remove('hidden');
    });
});

// ====== LOAD USERS (Contacts) ======
function loadUsers() {
    const q = query(collection(db, "users"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('contacts-list');
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const user = docSnap.data();
            if (user.uid !== currentUser.uid) {
                const div = document.createElement('div');
                div.className = 'list-item';
                div.textContent = user.name;
                div.onclick = () => openChat('private', user.uid, user.name);
                list.appendChild(div);
            }
        });
    });
}

// ====== LOAD GROUPS ======
function loadGroups() {
    const q = query(collection(db, "groups"), where("members", "array-contains", currentUser.uid));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('groups-list');
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const group = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-item';
            div.textContent = group.name;
            div.onclick = () => openChat('group', docSnap.id, group.name, group.creator);
            list.appendChild(div);
        });
    });
}

// ====== LOAD STATUSES ======
function loadStatuses() {
    const now = Date.now();
    const limit72h = now - (72 * 60 * 60 * 1000);
    
    const q = query(collection(db, "statuses"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('status-list');
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const status = docSnap.data();
            if (status.timestamp > limit72h && !isGuest) {
                const div = document.createElement('div');
                div.className = 'status-item';
                div.innerHTML = `<strong>${status.authorName}</strong><p>${status.text}</p>`;
                if (status.authorId === currentUser.uid) {
                    const delBtn = document.createElement('button');
                    delBtn.textContent = 'Delete';
                    delBtn.className = 'small-btn danger-btn';
                    delBtn.onclick = () => deleteDoc(doc(db, "statuses", docSnap.id));
                    div.appendChild(delBtn);
                }
                list.appendChild(div);
            }
        });
    });
}

// ====== CHAT SYSTEM ======
function getChatId(uid1, uid2) {
    return uid1 < uid2 ? `chat_${uid1}_${uid2}` : `chat_${uid2}_${uid1}`;
}

function openChat(type, id, name, creatorId = null) {
    activeChatType = type;
    activeChatName = name;
    activeChatNameLabel.textContent = name;
    
    if (type === 'private') {
        activeChatId = getChatId(currentUser.uid, id);
        groupActions.classList.add('hidden');
    } else {
        activeChatId = id;
        groupActions.classList.remove('hidden');
        document.getElementById('btn-manage-group').onclick = () => openManageGroup(id, name, creatorId);
    }

    if (!isGuest) {
        inputArea.classList.remove('disabled');
        msgInput.disabled = false;
        sendBtn.disabled = false;
    }

    if (unsubscribeMessages) unsubscribeMessages();

    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, where("chatId", "==", activeChatId), orderBy("timestamp", "asc"));
    
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            const div = document.createElement('div');
            div.className = `message ${msg.senderId === currentUser.uid ? 'sent' : 'received'}`;
            div.innerHTML = `<div class="msg-content">${msg.text}</div><div class="msg-time">${msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString() : '...'}</div>`;
            messagesContainer.appendChild(div);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    if (isGuest || !msgInput.value.trim() || !activeChatId) return;
    const text = msgInput.value.trim();
    msgInput.value = '';
    
    await addDoc(collection(db, "messages"), {
        chatId: activeChatId,
        chatType: activeChatType,
        senderId: currentUser.uid,
        text: text,
        timestamp: serverTimestamp()
    });
}

// ====== GROUP MANAGEMENT ======
const createGroupModal = document.getElementById('create-group-modal');
document.getElementById('btn-create-group-modal').onclick = () => {
    if(!isGuest) createGroupModal.classList.remove('hidden');
};
document.getElementById('btn-cancel-group').onclick = () => createGroupModal.classList.add('hidden');
document.getElementById('btn-confirm-group').onclick = async () => {
    const name = document.getElementById('new-group-name').value;
    if (name.trim()) {
        await addDoc(collection(db, "groups"), {
            name: name,
            creator: currentUser.uid,
            members: [currentUser.uid],
            createdAt: serverTimestamp()
        });
        createGroupModal.classList.add('hidden');
        document.getElementById('new-group-name').value = '';
    }
};

const manageGroupModal = document.getElementById('manage-group-modal');
let currentManageGroupId = null;

async function openManageGroup(groupId, groupName, creatorId) {
    currentManageGroupId = groupId;
    manageGroupModal.classList.remove('hidden');
    document.getElementById('manage-group-title').textContent = `Manage: ${groupName}`;
    
    const isCreator = currentUser.uid === creatorId;
    document.getElementById('btn-delete-group').style.display = isCreator ? 'block' : 'none';
    document.getElementById('btn-add-member').disabled = !isCreator;
    document.getElementById('add-member-email').disabled = !isCreator;

    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (groupDoc.exists()) {
        const members = groupDoc.data().members;
        const list = document.getElementById('group-members-list');
        list.innerHTML = '';
        
        for (const uid of members) {
            const uDoc = await getDoc(doc(db, "users", uid));
            const li = document.createElement('li');
            li.textContent = uDoc.exists() ? uDoc.data().name : uid;
            
            if (isCreator && uid !== currentUser.uid) {
                const remBtn = document.createElement('button');
                remBtn.textContent = 'Remove';
                remBtn.className = 'small-btn danger-btn';
                remBtn.onclick = async () => {
                    await updateDoc(doc(db, "groups", groupId), { members: arrayRemove(uid) });
                    openManageGroup(groupId, groupName, creatorId);
                };
                li.appendChild(remBtn);
            }
            list.appendChild(li);
        }
    }
}

document.getElementById('btn-close-manage').onclick = () => manageGroupModal.classList.add('hidden');

document.getElementById('btn-add-member').onclick = async () => {
    const email = document.getElementById('add-member-email').value.toLowerCase();
    if (!email) return;
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q); // Need to import getDocs but using workaround for modularity:
    onSnapshot(q, async (snapshot) => {
        if(!snapshot.empty) {
            const userToAdd = snapshot.docs[0].id;
            await updateDoc(doc(db, "groups", currentManageGroupId), { members: arrayUnion(userToAdd) });
            document.getElementById('add-member-email').value = '';
            manageGroupModal.classList.add('hidden'); // Refresh handled by reopen
        } else {
            alert("User not found");
        }
    });
};

document.getElementById('btn-delete-group').onclick = async () => {
    if (confirm("Are you sure?")) {
        await deleteDoc(doc(db, "groups", currentManageGroupId));
        manageGroupModal.classList.add('hidden');
        messagesContainer.innerHTML = '';
        activeChatNameLabel.textContent = 'Select a chat';
        inputArea.classList.add('disabled');
        msgInput.disabled = true;
        sendBtn.disabled = true;
    }
};

// ====== STATUS MANAGEMENT ======
const addStatusModal = document.getElementById('add-status-modal');
document.getElementById('btn-add-status-modal').onclick = () => {
    if(!isGuest) addStatusModal.classList.remove('hidden');
};
document.getElementById('btn-cancel-status').onclick = () => addStatusModal.classList.add('hidden');
document.getElementById('btn-confirm-status').onclick = async () => {
    const text = document.getElementById('new-status-text').value;
    if (text.trim()) {
        await addDoc(collection(db, "statuses"), {
            text: text,
            authorId: currentUser.uid,
            authorName: currentUserNameLabel.textContent,
            timestamp: Date.now()
        });
        addStatusModal.classList.add('hidden');
        document.getElementById('new-status-text').value = '';
    }
};

function setupUI() {
    if (isGuest) {
        document.getElementById('btn-create-group-modal').style.display = 'none';
        document.getElementById('btn-add-status-modal').style.display = 'none';
    }
}
