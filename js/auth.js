
export const AppEngine = {

    async sendMessage(message) {

        if (!message.trim()) return;

        const feed = document.getElementById("messageFeed");

        const div = document.createElement("div");

        div.className = "message";

        div.innerHTML = `
            <strong>You</strong>
            <p>${message}</p>
        `;

        feed.appendChild(div);

        feed.scrollTop = feed.scrollHeight;

    },

    streamMessages() {

        const feed = document.getElementById("messageFeed");

        feed.innerHTML = `
            <div class="message">
                <strong>System</strong>
                <p>Welcome to MWAMINI CHATTING SITE.</p>
            </div>
        `;

    }

};
