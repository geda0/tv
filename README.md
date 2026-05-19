# GVP — Generative Video Platform

A browser-only creator studio. Pick a rigged FBX character, optionally drop in
a video, add commentary (typed TTS or voice-captured), and record the canvas
plus mixed audio to a downloadable WebM file. Everything runs on-device — no
server, no API keys. The TTS voice model and Three.js assets are pulled from
public CDNs on first use.

## Run

The app needs HTTP (not `file://`) because `MediaRecorder` and `getUserMedia`
require a secure context:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/
```

## Workflow

1. Pick a **character** in the left panel. Switching releases the previous
   character's GPU resources.
2. (Optional) Click **Load video** in the studio bar. The video plays embedded
   in the scene and drives the timeline scrubber.
3. Click **Init audio** to grant the mic and start the Web Audio mix graph.
4. Add cues:
   - Type into the TTS box and **Add cue** — the cue's time is set to the
     current scrubber position; edit time/text inline.
   - Toggle **Voice cues** — speech is captured, keywords trigger character
     animations (`run`, `jump`, `dance`, …), and the recognized phrase is
     auto-added as a TTS cue at the current time.
5. **Start export**, then **Stop export**, then **Download WebM**. The
   filename comes from the studio bar input.

Animations and keywords:

| Animation | Triggers                       |
| --------- | ------------------------------ |
| Run       | run, walk, move                |
| Jump      | jump, play                     |
| Dance     | dance, capoeira, spin          |
| Cartwheel | cartwheel, flip                |
| Capoeira  | hello, stop                    |

## What's in the repo

| File           | Role                                                        |
| -------------- | ----------------------------------------------------------- |
| `index.html`   | Single-page app: scene, UI, voice cues, studio bar.         |
| `gvp.js`       | Audio mix graph, canvas WebM export, IndexedDB persistence. |
| `tts-wasm.js`  | Transformers.js (`Xenova/mms-tts-eng`) browser TTS.         |
| `models/*.fbx` | Characters and animation clips.                             |

## Browser support

- WebM canvas export needs a browser with `MediaRecorder` + WebM. The studio
  bar shows "Recording unavailable" when the codec check fails.
- `SpeechRecognition` is required for the **Voice cues** toggle. When missing
  (Firefox / Safari) the toggle is disabled; the rest of the app still works
  via typed TTS cues.

## Testing

Automated: `npm test` (vitest — covers `pickVideoMimeType`).
Manual smoke test: [TESTING.md](TESTING.md).
