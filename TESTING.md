# Manual smoke: WebM export and WASM TTS

Serve the app over HTTP (file URLs block some APIs):

```bash
cd /path/to/tv && python3 -m http.server 8080
```

Open `http://localhost:8080/` (or your port).

1. **Codec check** — Studio status should not say “Recording unavailable”. If it does, try another browser (WebM + MediaRecorder required).
2. **Init audio** — Click **Init audio**, allow the microphone. Status should become **Audio ready**; **Start export** should enable.
3. **Timeline** — Load a short video with **Load video** (optional). Scrub the range; timecode should follow. **Play** / **Pause** should stay in sync.
4. **WASM TTS** — In the left panel, type a line and use **Preview WASM** (first run downloads the model). You should hear speech through the mix.
5. **Cues + export** — **Add cue** at least once. Click **Start export**, wait for recording, **Stop export**, then **Download WebM** in the studio bar. Open the file: you should see the 3D canvas and hear embedded video / mic / TTS as mixed.
6. **Tab focus** — Keep the tab visible while exporting; background tabs may throttle rendering.

Automated checks: run `npm test` (tests `pickVideoMimeType` in Node with a mocked `MediaRecorder`).
