/**
 * Browser TTS via @xenova/transformers (ONNX Runtime WASM under the hood).
 * First call downloads the model (can be large — show progress in UI).
 */
/*
 * jsDelivr serves the package's prebuilt browser bundle (dist/transformers.min.js).
 * Do NOT use esm.sh here: it rebuilds from src/ and replaces the package's
 * `browser: { fs: false, url: false, ... }` stubs with Node polyfills, so the
 * library decides it is running in Node and throws
 * "The URL must be of scheme file" from url.fileURLToPath at import time.
 *
 * Imported lazily so the rest of the app never depends on this CDN loading.
 */
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

/** English MMS-TTS — relatively small vs SpeechT5. */
const MODEL_ID = 'Xenova/mms-tts-eng';

let pipelinePromise = null;

/**
 * @param {(progress: { status: string, file?: string, progress?: number }) => void} [onProgress]
 */
export function loadTtsModel(onProgress) {
    if (!pipelinePromise) {
        pipelinePromise = import(TRANSFORMERS_URL)
            .then(({ pipeline, env }) => {
                env.allowLocalModels = false;
                env.useBrowserCache = true;
                return pipeline('text-to-speech', MODEL_ID, {
                    progress_callback:
                        onProgress ||
                        function () {
                            /* noop */
                        },
                });
            })
            .catch((err) => {
                pipelinePromise = null; // allow a retry on the next call
                throw err;
            });
    }
    return pipelinePromise;
}

function toFloat32Audio(audio) {
    if (!audio) return null;
    if (audio instanceof Float32Array) {
        return audio;
    }
    if (typeof audio.data !== 'undefined') {
        const d = audio.data;
        if (d instanceof Float32Array) {
            return d;
        }
        return new Float32Array(d);
    }
    if (Array.isArray(audio)) {
        return Float32Array.from(audio);
    }
    return null;
}

/**
 * @param {AudioContext} audioContext
 * @param {string} text
 * @param {(progress: object) => void} [onProgress]
 * @returns {Promise<AudioBuffer>}
 */
export async function synthesizeToAudioBuffer(audioContext, text, onProgress) {
    const synth = await loadTtsModel(onProgress);
    const out = await synth(text.trim());
    const sr = out.sampling_rate || 16000;
    const raw = toFloat32Audio(out.audio);
    if (!raw || raw.length === 0) {
        throw new Error('TTS produced no audio');
    }
    const buf = audioContext.createBuffer(1, raw.length, sr);
    buf.copyToChannel(raw, 0);
    return buf;
}
