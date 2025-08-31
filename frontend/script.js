document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const recordBtn = document.getElementById('recordBtn');
    const statusEl = document.getElementById('status');
    const chatHistory = document.getElementById('chat-history');
    const audioPlayer = document.createElement('audio');

    // Settings Modal Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeBtn = document.querySelector('.close-btn');
    const saveKeysBtn = document.getElementById('saveKeysBtn');

    // --- Global State ---
    let isRecording = false;
    let webSocket = null;
    let fullTranscript = "";
    let audioChunksPlayback = [];
    
    // Web Audio API for recording
    let stream, audioContextRecording, processor, source;

    // --- Initialization ---
    function initializeApp() {
        loadApiKeys();
        checkKeysAndSetStatus();
        setupEventListeners();
        addMessage("Greetings, Noble Friend! How may I assist you today?", 'ai');
    }

    function setupEventListeners() {
        recordBtn.addEventListener('click', toggleRecording);
        settingsBtn.addEventListener('click', () => settingsModal.style.display = 'block');
        closeBtn.addEventListener('click', () => settingsModal.style.display = 'none');
        saveKeysBtn.addEventListener('click', () => {
            saveApiKeys();
            settingsModal.style.display = 'none';
            checkKeysAndSetStatus();
        });
        window.onclick = (event) => {
            if (event.target == settingsModal) {
                settingsModal.style.display = "none";
            }
        }
    }

    // --- API Key Management ---
    function saveApiKeys() {
        localStorage.setItem('assemblyai_key', document.getElementById('assemblyKey').value);
        localStorage.setItem('google_gemini_key', document.getElementById('googleKey').value);
        localStorage.setItem('murf_ai_key', document.getElementById('murfKey').value);
        alert("Your royal keys have been saved!");
    }

    function loadApiKeys() {
        document.getElementById('assemblyKey').value = localStorage.getItem('assemblyai_key') || '';
        document.getElementById('googleKey').value = localStorage.getItem('google_gemini_key') || '';
        document.getElementById('murfKey').value = localStorage.getItem('murf_ai_key') || '';
    }

    function getApiKeys() {
        return {
            assemblyai: localStorage.getItem('assemblyai_key'),
            google_gemini: localStorage.getItem('google_gemini_key'),
            murf_ai: localStorage.getItem('murf_ai_key'),
        };
    }

    function checkKeysAndSetStatus() {
        const keys = getApiKeys();
        if (!keys.assemblyai || !keys.google_gemini || !keys.murf_ai) {
            recordBtn.disabled = true;
            statusEl.textContent = "Please provide the secret keys in the settings ⚙️";
        } else {
            recordBtn.disabled = false;
            statusEl.textContent = "Ready for your command";
        }
    }

    // --- Chat History & UI ---
    function addMessage(text, type) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}-bubble`;
        bubble.textContent = text;
        chatHistory.appendChild(bubble);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        
        // Store user messages in the full transcript
        if (type === 'user') {
            fullTranscript += `User: ${text}\n`;
        } else if (type === 'ai') {
            fullTranscript += `AI: ${text}\n`;
        }
    }

    function updateLiveTranscript(text) {
        let liveBubble = chatHistory.querySelector('.user-bubble.live');
        if (!liveBubble) {
            liveBubble = document.createElement('div');
            liveBubble.className = 'chat-bubble user-bubble live';
            chatHistory.appendChild(liveBubble);
        }
        liveBubble.textContent = text;
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // --- WebSocket Logic ---
    function setupWebSocket() {
        return new Promise((resolve, reject) => {
            const keys = getApiKeys();
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const finalWsUrl = `${protocol}//${window.location.host}/ws?assemblyai_key=${keys.assemblyai}&google_gemini_key=${keys.google_gemini}&murf_ai_key=${keys.murf_ai}`;

            webSocket = new WebSocket(finalWsUrl);
            webSocket.onopen = resolve;
            webSocket.onmessage = handleWebSocketMessage;
            webSocket.onerror = (error) => { reject(error); };
            webSocket.onclose = (event) => { 
                if (isRecording) { stopRecordingCleanup(); } 
                statusEl.textContent = event.reason || "My royal duties are complete. Speak again when you wish!"; 
            };
        });
    }

    function handleWebSocketMessage(event) {
        const message = event.data;
        if (message.startsWith("AUDIO_CHUNK:")) {
            audioChunksPlayback.push(base64ToArrayBuffer(message.substring("AUDIO_CHUNK:".length)));
        } else if (message === "AUDIO_END") {
            playConcatenatedAudio();
        } else if (message.startsWith("AI_RESPONSE:")) {
            const aiResponse = message.substring("AI_RESPONSE:".length);
            addMessage(aiResponse, 'ai');
            statusEl.textContent = "Her Highness is speaking...";
        } else if (message === "END_OF_TURN") {
            // Convert the live transcript to a permanent user message
            const liveBubble = chatHistory.querySelector('.user-bubble.live');
            if (liveBubble && liveBubble.textContent.trim() !== '') {
                // Create a permanent user message with the live transcript content
                addMessage(liveBubble.textContent, 'user');
                // Remove the temporary live bubble
                liveBubble.remove();
            }
            statusEl.textContent = "Considering your request...";
        } else if (message.startsWith("FINAL_TRANSCRIPT:")) {
            // Handle final transcript from backend
            const finalTranscript = message.substring("FINAL_TRANSCRIPT:".length);
            const liveBubble = chatHistory.querySelector('.user-bubble.live');
            if (liveBubble) liveBubble.remove();
            addMessage(finalTranscript, 'user');
        } else {
            // This updates your speech in real-time in the live bubble
            updateLiveTranscript(message);
        }
    }

    // --- Audio Playback Functions ---
    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function playConcatenatedAudio() {
        if (audioChunksPlayback.length === 0) return;
        const audioBlob = new Blob(audioChunksPlayback, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayer.src = audioUrl;
        audioPlayer.play();
        audioPlayer.onended = () => {
            console.log("Playback finished.");
            URL.revokeObjectURL(audioUrl);
            audioChunksPlayback = [];
            statusEl.textContent = "Ready for your command";
        };
    }

    // --- Recording Functions ---
    function toggleRecording() { isRecording ? stopRecording() : startRecording(); }

    function floatTo16BitPCM(input) {
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    }

    async function startRecording() {
        if (isRecording) return;

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
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = floatTo16BitPCM(inputData);
                if (webSocket && webSocket.readyState === WebSocket.OPEN) {
                    webSocket.send(pcmData);
                }
            };
        } catch (err) {
            console.error("Microphone or WebSocket error:", err);
            statusEl.textContent = "Could not start recording.";
            stopRecordingCleanup();
        }
    }

    function stopRecording() {
        if (webSocket && webSocket.readyState === WebSocket.OPEN) {
            webSocket.close();
        }
        stopRecordingCleanup();
    }

    function stopRecordingCleanup() {
        if (processor) { processor.disconnect(); processor.onaudioprocess = null; }
        if (source) source.disconnect();
        if (audioContextRecording) audioContextRecording.close();
        if (stream) { stream.getTracks().forEach(track => track.stop()); }
        isRecording = false;
        updateButtonUI(false);
        
        // Remove any live transcript bubble if it exists
        const liveBubble = chatHistory.querySelector('.user-bubble.live');
        if (liveBubble) liveBubble.remove();
    }

    function updateButtonUI(recording) {
        const icon = recordBtn.querySelector('.icon');
        if (recording) {
            recordBtn.classList.add("recording");
            icon.textContent = "⏹️";
        } else {
            recordBtn.classList.remove("recording");
            icon.textContent = "🎙️";
        }
    }

    initializeApp();
});
