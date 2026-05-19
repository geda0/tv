# GVP — Generative Video Platform

Browser-only creator app. A Three.js scene with rigged FBX characters reacts to
the user's voice (animations are triggered by keywords like *run*, *jump*,
*dance*), and a "Studio" bar mixes mic + an optionally-embedded video + browser
WASM TTS into a downloadable WebM recording of the canvas.

Everything runs client-side: no server, no API keys. The TTS model and Three.js
assets are fetched from public CDNs on first use.

## Run

The app needs HTTP (not `file://`) because MediaRecorder and getUserMedia are
gated behind a secure context:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/
```

Manual smoke test: see [TESTING.md](TESTING.md).
Automated test: `npm test` (vitest — covers `pickVideoMimeType`).

## What's in the repo

| File              | Role                                                        |
| ----------------- | ----------------------------------------------------------- |
| `index.html`      | Single-page app: scene, UI, speech recognition, studio bar. |
| `gvp.js`          | Audio mix graph, canvas WebM export, IndexedDB persistence. |
| `tts-wasm.js`     | Transformers.js (`Xenova/mms-tts-eng`) browser TTS.         |
| `models/*.fbx`    | Characters and animation clips.                             |

## Browser support

- WebM canvas export needs a Chromium-based browser or a recent Firefox with
  `MediaRecorder` + WebM support. The Studio bar shows "Recording unavailable"
  when the codec check fails.
- Speech recognition uses the WebKit/Standard `SpeechRecognition` API. When
  it's missing (Firefox/Safari), the "Start!" button is disabled — the rest of
  the app still works.
