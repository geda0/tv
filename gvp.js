/**
 * GVP: Web Audio mix bus, WebM export, IndexedDB project persistence.
 * Manual browser checks: see TESTING.md. Automated: `npm test` (pickVideoMimeType).
 */

const DB_NAME = 'gvp-projects';
const DB_VERSION = 1;
const STORE = 'projects';

export function pickVideoMimeType() {
    const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm',
    ];
    for (const c of candidates) {
        if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return '';
}

/**
 * @param {HTMLVideoElement} videoEl
 * @param {MediaStream | null} micStream
 */
export function createAudioGraph(videoEl, micStream) {
    /** Route playback only through Web Audio — avoids double output from the element. */
    videoEl.muted = true;
    videoEl.setAttribute('playsinline', '');

    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();

    const gainVideo = ctx.createGain();
    const gainVideoMonitor = ctx.createGain();
    const gainMic = ctx.createGain();
    const gainMicMonitor = ctx.createGain();

    gainVideo.gain.value = 0.7;
    gainVideoMonitor.gain.value = 1;
    gainMic.gain.value = 1;
    /** 0 = no mic to speakers (avoids acoustic feedback / echo with speakers). */
    gainMicMonitor.gain.value = 0;

    /** One MediaElementAudioSourceNode per HTMLMediaElement (browser rule). */
    const videoSource = ctx.createMediaElementSource(videoEl);
    videoSource.connect(gainVideo);

    gainVideo.connect(dest);
    gainVideo.connect(gainVideoMonitor);
    gainVideoMonitor.connect(ctx.destination);

    let micSource = null;

    function setMicStream(stream) {
        if (micSource) {
            try {
                micSource.disconnect();
            } catch (_) {}
            micSource = null;
        }
        if (stream && stream.getAudioTracks().length) {
            micSource = ctx.createMediaStreamSource(stream);
            micSource.connect(gainMic);
            gainMic.connect(dest);
            gainMic.connect(gainMicMonitor);
            gainMicMonitor.connect(ctx.destination);
        }
    }

    setMicStream(micStream);

    const gainTTS = ctx.createGain();
    const gainTTSMonitor = ctx.createGain();
    gainTTS.gain.value = 0.85;
    gainTTSMonitor.gain.value = 1;
    gainTTS.connect(dest);
    gainTTS.connect(gainTTSMonitor);
    gainTTSMonitor.connect(ctx.destination);

    return {
        context: ctx,
        gainVideo,
        gainVideoMonitor,
        gainMic,
        gainMicMonitor,
        gainTTS,
        gainTTSMonitor,
        destination: dest,
        /** @param {MediaStream} stream */
        setMicStream,
        dispose() {
            try {
                ctx.close();
            } catch (_) {}
        },
    };
}

/**
 * Play decoded TTS through the mix bus (recording + optional monitor).
 * @param {ReturnType<typeof createAudioGraph>} audioGraph
 * @param {AudioBuffer} audioBuffer
 * @param {number} whenSecondsFromNow relative to audioContext.currentTime
 * @returns {AudioBufferSourceNode}
 */
export function playTtsBuffer(audioGraph, audioBuffer, whenSecondsFromNow = 0) {
    const ctx = audioGraph.context;
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(audioGraph.gainTTS);
    const t = ctx.currentTime + Math.max(0, whenSecondsFromNow);
    src.start(t);
    return src;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {MediaStream} mixedAudioStream
 * @param {{ fps?: number, videoBitsPerSecond?: number }} opts
 */
export function startCanvasExport(canvas, mixedAudioStream, opts = {}) {
    const fps = opts.fps ?? 30;
    const videoBitsPerSecond = opts.videoBitsPerSecond ?? 2500000;

    const mimeType = pickVideoMimeType();
    const videoStream = canvas.captureStream(fps);
    const combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...mixedAudioStream.getAudioTracks(),
    ]);

    const options = { mimeType };
    if (mimeType) {
        options.videoBitsPerSecond = videoBitsPerSecond;
        if (mimeType.includes('opus')) {
            options.audioBitsPerSecond = 128000;
        }
    }

    let recorder;
    try {
        recorder = new MediaRecorder(combined, Object.keys(options).length ? options : undefined);
    } catch (e) {
        recorder = new MediaRecorder(combined);
    }

    const chunks = [];
    recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
    };

    recorder.start(250);

    return {
        recorder,
        stop() {
            return new Promise((resolve, reject) => {
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
                    resolve(blob);
                };
                recorder.onerror = (ev) => reject(ev.error || new Error('MediaRecorder error'));
                try {
                    recorder.stop();
                } catch (e) {
                    reject(e);
                }
            });
        },
    };
}

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
            }
        };
    });
}

/**
 * @param {string} id
 * @param {object} project — must be structured (no live Audio/DOM refs)
 */
export async function saveProjectToIndexedDB(id, project) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(STORE).put({ id, ...project, savedAt: Date.now() });
    });
}

export async function loadProjectFromIndexedDB(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

export function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function readJsonFile(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
            try {
                resolve(JSON.parse(String(r.result)));
            } catch (e) {
                reject(e);
            }
        };
        r.onerror = () => reject(r.error);
        r.readAsText(file);
    });
}
