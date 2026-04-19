/**
 * GVP: Web Audio mix bus, WebM export, IndexedDB project persistence.
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
    const ctx = new AudioContext();
    const gainVideo = ctx.createGain();
    const gainMic = ctx.createGain();
    const dest = ctx.createMediaStreamDestination();

    gainVideo.gain.value = 0.7;
    gainMic.gain.value = 1;

    let micSource = null;

    /** One MediaElementAudioSourceNode per HTMLMediaElement (browser rule). */
    const videoSource = ctx.createMediaElementSource(videoEl);
    videoSource.connect(gainVideo);

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
        }
    }

    setMicStream(micStream);

    gainVideo.connect(dest);
    gainMic.connect(dest);
    gainVideo.connect(ctx.destination);
    gainMic.connect(ctx.destination);

    return {
        context: ctx,
        gainVideo,
        gainMic,
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
