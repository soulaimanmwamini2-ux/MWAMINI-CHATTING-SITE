import { db } from "./auth.js"; // FIXED IMPORT
import {
    collection,
    addDoc,
    onSnapshot,
    orderBy,
    query,
    where,
    serverTimestamp,
    doc,
    deleteDoc,
    updateDoc,
    arrayUnion,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const App = {
    activeChatId: null,
    activeChatType: null, 
    activeGroupOwner: null,
    unsubscribeMessages: null,

    init(user) {
        this.loadRoomsAndGroups(user);
        this.loadStatuses(user);
    },

    loadRoomsAndGroups(user) {
        const userIdentifier = user.isAnonymous ? "Guest" : user.email;
        const q = query(collection(db, "chats"), where("members", "arrayContains", userIdentifier));

        onSnapshot(q, (snap) => {
            const listContainer = document.getElementById("groupList");
            listContainer.innerHTML = "";

            snap.forEach((docSnap) => {
                const room = docSnap.data();
                const div = document.createElement("div");
                div.className = "chat-item-row";
                div.innerText = room.type === "group" ? `👥 ${room.name}` : `🔒 ${room.name.replace(userIdentifier, "").replace("-", "")}`;
                
                div.onclick = () => this.switchChat(docSnap.id, room, userIdentifier);
                listContainer.appendChild(div);
            });
        });
    },

    async startPrivateChat(targetEmail, currentUser) {
        if (currentUser.isAnonymous) return alert("Guest users cannot start private chats.");
        if (targetEmail === currentUser.email) return alert("You cannot chat with yourself.");

        const q = query(
            collection(db, "chats"), 
            where("type", "==", "direct"), 
            where("members", "arrayContains", currentUser.email)
        );
        
        const snap = await getDocs(q);
        let existingChat = null;
        snap.forEach(d => {
            if(d.data().members.includes(targetEmail)) existingChat = d.id;
        });

        if (existingChat) {
            this.switchChat(existingChat, { type: "direct", name: `${currentUser.email}-${targetEmail}` }, currentUser.email);
            return;
        }

        await addDoc(collection(db, "chats"), {
            name: `${currentUser.email}-${targetEmail}`,
            type: "direct",
            members: [currentUser.email, targetEmail],
            createdBy: currentUser.email
        });
    },

    async createGroup(groupName, currentUser) {
        await addDoc(collection(db, "chats"), {
            name: groupName,
            type: "group",
            members: [currentUser.email],
            createdBy: currentUser.email
        });
    },

    switchChat(chatId, roomData, userIdentifier) {
        this.activeChatId = chatId;
        this.activeChatType = roomData.type;
        this.activeGroupOwner = roomData.createdBy;

        const titleText = roomData.type === "group" ? `Group: ${roomData.name}` : `Chat with: ${roomData.name.replace(userIdentifier, "").replace("-", "")}`;
        document.getElementById("currentChatTitle").innerText = titleText;

        const managementUI = document.getElementById("groupManageControls");
        if (roomData.type === "group" && roomData.createdBy === userIdentifier) {
            managementUI.classList.remove("hidden");
        } else {
            managementUI.classList.add("hidden");
        }

        this.listenForLiveMessages();
    },

    listenForLiveMessages() {
        if (this.unsubscribeMessages) this.unsubscribeMessages();

        const q = query(
            collection(db, "messages"),
            where("chatId", "==", this.activeChatId),
            orderBy("time", "asc")
        );

        this.unsubscribeMessages = onSnapshot(q, (snap) => {
            const box = document.getElementById("chatBox");
            box.innerHTML = "";

            snap.forEach((docSnap) => {
                const msg = docSnap.data();
                const div = document.createElement("div");
                div.className = "message-bubble";
                div.innerHTML = `<b>${msg.senderName}</b><span class="timestamp">${msg.time ? new Date(msg.time.seconds*1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span><br><p>${msg.text}</p>`;
                box.appendChild(div);
            });
            box.scrollTop = box.scrollHeight;
        });
    },

    async sendMessage(messageText, user) {
        if (!this.activeChatId) return alert("Please select a chat channel first.");
        
        await addDoc(collection(db, "messages"), {
            chatId: this.activeChatId,
            text: messageText,
            senderId: user.uid,
            senderName: user.isAnonymous ? "Guest" : (user.displayName || user.email),
            time: serverTimestamp()
        });
    },

    async addMemberToGroup(targetEmail) {
        if (this.activeChatType !== "group") return;
        const roomRef = doc(db, "chats", this.activeChatId);
        await updateDoc(roomRef, {
            members: arrayUnion(targetEmail)
        });
        alert(`User (${targetEmail}) added successfully.`);
    },

    async deleteCurrentGroup(currentUser) {
        if (this.activeGroupOwner !== currentUser.email) return alert("Unauthorized access profile.");
        await deleteDoc(doc(db, "chats", this.activeChatId));
        document.getElementById("currentChatTitle").innerText = "Select a conversation to start chatting";
        document.getElementById("groupManageControls").classList.add("hidden");
        document.getElementById("chatBox").innerHTML = "";
        if (this.unsubscribeMessages) this.unsubscribeMessages();
    },

    async postStatus(statusText, currentUser) {
        await addDoc(collection(db, "statuses"), {
            text: statusText,
            ownerEmail: currentUser.email,
            ownerName: currentUser.displayName || currentUser.email,
            createdAt: Date.now() 
        });
    },

    loadStatuses(currentUser) {
        const thresholdTime = Date.now() - (72 * 60 * 60 * 1000); 
        const q = query(collection(db, "statuses"), where("createdAt", ">=", thresholdTime));

        onSnapshot(q, (snap) => {
            const container = document.getElementById("statusContainer");
            container.innerHTML = "";

            snap.forEach((docSnap) => {
                const data = docSnap.data();
                const div = document.createElement("div");
                div.className = "status-card";
                
                let deleteButtonHTML = '';
                if (data.ownerEmail === currentUser.email) {
                    deleteButtonHTML = `<button class="delete-status-btn" data-id="${docSnap.id}">×</button>`;
                }

                div.innerHTML = `
                    <div class="status-header">
                        <strong>${data.ownerName}</strong>
                        ${deleteButtonHTML}
                    </div>
                    <p class="status-body">${data.text}</p>
                `;
                container.appendChild(div);
            });

            document.querySelectorAll(".delete-status-btn").forEach(btn => {
                btn.onclick = async (e) => {
                    const statusId = e.target.getAttribute("data-id");
                    await deleteDoc(doc(db, "statuses", statusId));
                };
            });
        });
    }
};
