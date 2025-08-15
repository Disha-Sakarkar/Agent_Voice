window.addEventListener('load', () => {
    // Get all the elements we need
    const recordBtn = document.getElementById("recordBtn");
    const statusMessage = document.getElementById("statusMessage");
    const audioPlayer = document.getElementById("audioPlayer");
    const chatHistoryContainer = document.getElementById("chatHistoryContainer");
    const sessionList = document.getElementById("sessionList");
    const newChatBtn = document.getElementById("newChatBtn");

    let mediaRecorder;
    let audioChunks = [];
    let activeSessionId = null;
    let isRecording = false;

    // --- Core Functions ---

    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Sets the active session, clears the UI, and updates the URL
    function setActiveSession(sessionId) {
        activeSessionId = sessionId;
        chatHistoryContainer.innerHTML = '';
        window.history.pushState({ sessionId }, '', `?session_id=${sessionId}`);
        updateSessionListUI();
        statusMessage.textContent = "Click the button to talk";
        recordBtn.disabled = false;
    }

    // Fetches and displays the history for the active chat
    async function loadChatHistory(sessionId) {
        if (!sessionId) return;
        try {
            const response = await fetch(`/agent/chat/${sessionId}`);
            if (!response.ok) throw new Error("Session history not found.");
            
            const data = await response.json();
            chatHistoryContainer.innerHTML = '';
            data.history.forEach(message => {
                appendMessage(message.role, message.parts[0].text);
            });
        } catch (err) {
            appendMessage('system', `Could not load chat: ${err.message}`);
        }
    }

    // --- UI Update Functions ---

    function appendMessage(sender, text) {
        const senderClass = sender === 'user' ? 'user' : (sender === 'model' ? 'bot' : 'system');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', `${senderClass}-message`);
        const messageParagraph = document.createElement('p');
        messageParagraph.textContent = text;
        messageDiv.appendChild(messageParagraph);
        chatHistoryContainer.appendChild(messageDiv);
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
    }
    
    // Fetches all sessions from server and populates the side menu
    async function updateSessionList() {
        try {
            const response = await fetch('/agent/sessions');
            const data = await response.json();
            sessionList.innerHTML = '';
            data.sessions.forEach(session => {
                const li = document.createElement('li');
                li.textContent = session.name; // Use the smart name
                li.dataset.sessionId = session.id;
                li.title = session.name; // Show full name on hover
                li.addEventListener('click', () => {
                    setActiveSession(session.id);
                    loadChatHistory(session.id);
                });
                sessionList.appendChild(li);
            });
            updateSessionListUI();
        } catch (err) {
            console.error("Failed to update session list:", err);
        }
    }

    // Highlights the active session in the side menu
    function updateSessionListUI() {
        const allSessions = sessionList.querySelectorAll('li');
        allSessions.forEach(li => {
            li.classList.toggle('active', li.dataset.sessionId === activeSessionId);
        });
    }

    function setButtonState(state) {
        recordBtn.classList.toggle('recording', state === 'recording');
        recordBtn.classList.toggle('idle', state !== 'recording');
        isRecording = state === 'recording';
    }

    // --- Recording and API Call Logic ---

    async function startRecording() {
        if (!activeSessionId) {
            statusMessage.textContent = "Please start a new chat first.";
            return;
        }
        // ... (startRecording logic is the same)
        try {
            audioChunks = []; const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.ondataavailable = event => { if (event.data.size > 0) audioChunks.push(event.data); };
            mediaRecorder.onstop = handleRecordingStop;
            mediaRecorder.start();
            setButtonState('recording'); statusMessage.textContent = "Listening...";
        } catch (err) { alert("Microphone access denied."); setButtonState('idle'); }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            setButtonState('idle');
            statusMessage.textContent = "Processing...";
        }
    }

    async function handleRecordingStop() {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("file", audioBlob, "user_audio.webm");
        const isNewChat = !sessionList.querySelector(`[data-session-id="${activeSessionId}"]`);

        try {
            const response = await fetch(`/agent/chat/${activeSessionId}`, { method: "POST", body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || "Server error.");

            if (result.is_error) {
                appendMessage('system', result.error_message);
                if (result.audio_url) { audioPlayer.src = result.audio_url; audioPlayer.play(); }
            } else {
                // If it's the first message, clear the "New Chat" placeholder
                if (isNewChat) chatHistoryContainer.innerHTML = ''; 
                appendMessage('user', result.transcription);
                appendMessage('bot', result.llm_response);
                if (result.audio_url) { audioPlayer.src = result.audio_url; audioPlayer.play(); }
            }
            // If this was a new chat, refresh the session list to get the new smart name
            if (isNewChat) {
                await updateSessionList();
            }
        } catch (err) {
            appendMessage('system', `❌ Error: ${err.message}`);
            setButtonState('idle');
        }
    }

    // --- Event Listeners ---
    recordBtn.addEventListener('click', () => { isRecording ? stopRecording() : startRecording(); });
    newChatBtn.addEventListener('click', () => {
        const newSessionId = generateSessionId();
        setActiveSession(newSessionId);
        appendMessage('system', "New chat started. Click the button and start speaking.");
    });
    audioPlayer.addEventListener('ended', () => { statusMessage.textContent = "Your turn! Click to talk."; setButtonState('idle'); });

    // --- Initial Load ---
    (async () => {
        await updateSessionList();
        const params = new URLSearchParams(window.location.search);
        const urlSessionId = params.get('session_id');
        if (urlSessionId && sessionList.querySelector(`[data-session-id="${urlSessionId}"]`)) {
            setActiveSession(urlSessionId);
            loadChatHistory(urlSessionId);
        } else {
            recordBtn.disabled = true;
            statusMessage.textContent = "Start a new chat or select one from the list.";
        }
    })();
});