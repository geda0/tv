/**
 * Browser TTS via @xenova/transformers (ONNX Runtime WASM under the hood).
 * First call downloads the model (can be large — show progress in UI).
 */
import { pipeline, env } from 'https://esm.sh/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
env.useBrowserCache = true;

/** English MMS-TTS — relatively small vs SpeechT5. */
const MODEL_ID = 'Xenova/mms-tts-eng';

let pipelinePromise = null;

/**
 * @param {(progress: { status: string, file?: string, progress?: number }) => void} [onProgress]
 */
export function loadTtsModel(onProgress) {
    if (!pipelinePromise) {
        pipelinePromise = pipeline('text-to-speech', MODEL_ID, {
            progress_callback:
                onProgress ||
                function () {
                    /* noop */
                },
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
