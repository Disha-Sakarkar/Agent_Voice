document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References from YOUR HTML ---
    const recordBtn = document.getElementById('recordBtn');
    const statusEl = document.getElementById('status');
    const chatHistoryContainer = document.getElementById('chat-history');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeBtn = document.querySelector('.close-btn');
    const saveKeysBtn = document.getElementById('saveKeysBtn');
    const murfKeyInput = document.getElementById('murfKey');
    const assemblyKeyInput = document.getElementById('assemblyKey');
    const googleKeyInput = document.getElementById('googleKey');
    const audioPlayer = document.createElement('audio');

    // --- Global State ---
    let webSocket;
    let isRecording = false;
    let stream, audioContextRecording, processor, source;
    let apiKeys = { murf: '', assembly: '', google: '' };
    
    // --- Initialization ---
    function initialize() {
        loadKeysFromLocalStorage();
        setupEventListeners();
    }

    function setupEventListeners() {
        recordBtn.addEventListener('click', toggleRecording);
        settingsBtn.addEventListener('click', () => settingsModal.style.display = 'block');
        closeBtn.addEventListener('click', () => settingsModal.style.display = 'none');
        saveKeysBtn.addEventListener('click', saveKeysToLocalStorage);
        window.addEventListener('click', (event) => {
            if (event.target == settingsModal) settingsModal.style.display = 'none';
        });
    }

    // --- UI State Management ---
    function addMessageToHistory(text, type) {
        // Uses your CSS classes: user-bubble, ai-bubble, system-bubble
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}-bubble`;
        bubble.textContent = text;
        chatHistoryContainer.appendChild(bubble);
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
    }

    function updateLiveTranscript(text) {
        let liveBubble = chatHistoryContainer.querySelector('.user-bubble.live');
        if (!liveBubble) {
            liveBubble = document.createElement('div');
            liveBubble.className = 'chat-bubble user-bubble live';
            addMessageToHistory('', 'user'); // Add a placeholder bubble
            liveBubble = chatHistoryContainer.querySelector('.user-bubble:last-child');
            liveBubble.classList.add('live');
        }
        liveBubble.textContent = text;
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
    }

    // --- API Key Management ---
    function loadKeysFromLocalStorage() {
        apiKeys.murf = localStorage.getItem('murfKey') || '';
        apiKeys.assembly = localStorage.getItem('assemblyKey') || '';
        apiKeys.google = localStorage.getItem('googleKey') || '';
        murfKeyInput.value = apiKeys.murf;
        assemblyKeyInput.value = apiKeys.assembly;
        googleKeyInput.value = apiKeys.google;

        if (!apiKeys.murf || !apiKeys.assembly || !apiKeys.google) {
            statusEl.textContent = "Please enter API keys in Settings.";
            recordBtn.disabled = true;
            addMessageToHistory("Welcome! Please enter your API keys in the ⚙️ Settings menu to begin.", 'system');
        } else {
            statusEl.textContent = "Ready. Click the mic to start.";
            recordBtn.disabled = false;
        }
    }

    function saveKeysToLocalStorage() {
        // Simplified for your 3 keys
        const murfKey = murfKeyInput.value.trim();
        const assemblyKey = assemblyKeyInput.value.trim();
        const googleKey = googleKeyInput.value.trim();

        if (!murfKey || !assemblyKey || !googleKey) {
            alert("Please enter all three API keys before saving.");
            return;
        }
        localStorage.setItem('murfKey', murfKey);
        localStorage.setItem('assemblyKey', assemblyKey);
        localStorage.setItem('googleKey', googleKey);
        
        settingsModal.style.display = 'none';
        loadKeysFromLocalStorage();
        alert("API Keys saved successfully!");
    }

    // --- WebSocket Logic ---
    // In frontend/script.js

function setupWebSocket() {
    return new Promise((resolve, reject) => {
        // --- 🎯 THIS IS THE DYNAMIC URL LOGIC 🎯 ---
        // It checks if the site is secure (https) and uses the current host address
        const isSecure = window.location.protocol === 'https:';
        const wsProtocol = isSecure ? 'wss://' : 'ws://';
        const wsHost = window.location.host; // This gets '127.0.0.1:8000' or 'your-deployed-site.com'
        const sessionId = `session_${Date.now()}`;

        // This line now builds the URL dynamically
        const wsUrl = `${wsProtocol}${wsHost}/ws?session_id=${sessionId}&murf_key=${apiKeys.murf}&assembly_key=${apiKeys.assembly}&google_key=${apiKeys.google}`;
        
        console.log(`Connecting to WebSocket at: ${wsUrl}`);
        webSocket = new WebSocket(wsUrl);
        
        // The rest of the function remains the same
        webSocket.onopen = () => { console.log("WebSocket established!"); resolve(); };
        webSocket.onerror = (error) => { console.error("WebSocket Error:", error); statusEl.textContent = "Connection error."; reject(error); };
        webSocket.onclose = () => { console.log("WebSocket closed."); if (isRecording) stopRecordingCleanup(); };

        let audioChunksPlayback = [];
        webSocket.onmessage = (event) => {
            const message = event.data;
            if (message.startsWith("AUDIO_CHUNK:")) {
                audioChunksPlayback.push(base64ToArrayBuffer(message.substring("AUDIO_CHUNK:".length)));
            } else if (message === "AUDIO_END") {
                playConcatenatedAudio(audioChunksPlayback, () => { audioChunksPlayback = []; });
                statusEl.textContent = "Ready. Click the mic to start.";
            } else if (message.startsWith("AI_RESPONSE:")) {
                addMessageToHistory(message.substring("AI_RESPONSE:".length), 'ai');
                statusEl.textContent = "Speaking...";
            } else if (message === "END_OF_TURN") {
                const userBubble = chatHistoryContainer.querySelector('.user-bubble.live');
                if (userBubble) userBubble.classList.remove('live');
                statusEl.textContent = "Thinking...";
            } else {
                updateLiveTranscript(message);
            }
        };
    });
}

    // --- Audio Recording & Playback ---
    async function startRecording() {
        if (isRecording) return;

        // Interrupt AI playback if user starts talking (barge-in)
        if (!audioPlayer.paused) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            console.log("Agent playback interrupted.");
        }

        isRecording = true;
        updateButtonUI(true);
        statusEl.textContent = "Connecting...";
        try {
            await setupWebSocket();
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRecording = new AudioContext({ sampleRate: 16000 });
            source = audioContextRecording.createMediaStreamSource(stream);
            processor = audioContextRecording.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioContextRecording.destination);
            processor.onaudioprocess = (e) => {
                const pcmData = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
                if (webSocket && webSocket.readyState === WebSocket.OPEN) {
                    webSocket.send(pcmData);
                }
            };
            statusEl.textContent = "Listening...";
        } catch (err) {
            console.error("Recording error:", err);
            statusEl.textContent = "Could not start. Check permissions.";
            stopRecordingCleanup();
        }
    }

    function stopRecording() {
        if (webSocket && webSocket.readyState === WebSocket.OPEN) webSocket.close();
        stopRecordingCleanup();
    }

    function stopRecordingCleanup() {
        if (processor) { processor.disconnect(); processor.onaudioprocess = null; }
        if (source) source.disconnect();
        if (audioContextRecording && audioContextRecording.state !== 'closed') audioContextRecording.close();
        if (stream) { stream.getTracks().forEach(track => track.stop()); }
        isRecording = false;
        updateButtonUI(false);
        statusEl.textContent = "Ready. Click the mic to start.";
    }

    function toggleRecording() { isRecording ? stopRecording() : startRecording(); }
    function updateButtonUI(recording) {
        const icon = recordBtn.querySelector('.icon');
        recordBtn.classList.toggle("recording", recording);
        icon.textContent = recording ? "⏹️" : "🎙️";
    }
    
    // --- Utility Functions ---
    function floatTo16BitPCM(input) {
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    }
    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
        return bytes.buffer;
    }
    function playConcatenatedAudio(audioChunks, onEndedCallback) {
        if (audioChunks.length === 0) return;
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
        audioPlayer.play();
        audioPlayer.onended = () => { URL.revokeObjectURL(audioUrl); if (onEndedCallback) onEndedCallback(); };
    }
    
    initialize();
});