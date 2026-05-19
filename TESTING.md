# Manual smoke test

Serve over HTTP — `file://` blocks `MediaRecorder`, `getUserMedia`, and
WebAudio:

```bash
python3 -m http.server 8080
# open http://localhost:8080/
```

## Golden path

1. **Codec check** — Studio status should not read "Recording unavailable". If
   it does, try another browser (WebM + `MediaRecorder` required).
2. **Pick a character** — Side panel → click **Glasses / Aj / Remy / pmm**.
   Status updates ("Loading…" → "Aj loaded."). Animation buttons enable.
3. **Animations** — Click Run / Jump / Dance / Cartwheel / Capoeira. The
   character should switch clip and the active button should highlight.
4. **Load video** (optional) — Studio bar → **Load video**, pick a small file.
   Scrubber should reflect the video's duration; play/pause via the studio
   button (or Space).
5. **Init audio** — Click **Init audio**, allow the microphone. Status becomes
   "Audio ready". **Start export** enables.
6. **TTS cue** — Type a line into the TTS box. Click **Preview** (first run
   downloads the model — wait for "Ready"). Click **Add cue**. The cue row
   shows editable time/text plus ▶ and ✕.
7. **Voice cues** (optional, Chromium/Edge/Safari only) — Click
   **Voice cues: off** to switch it on. Speak "run" → character should switch
   to the Run clip. Each phrase appears as a new TTS cue.
8. **Export** — Set a filename. Click **Start export**, wait a few seconds,
   click **Stop export**. **Download WebM** appears with the chosen filename.
   Open the file — you should see the 3D canvas and hear mic / video / TTS as
   mixed.

## State / leak checks

- Switch character mid-session — previous FBX should disappear without console
  errors; status should report the new character.
- **Reset** — confirms, then clears character / video / cues. Subsequent
  Save/Load should round-trip cleanly.
- Save → reload page → Load. Cues, character, embedded video, mix gains
  should restore.
- Try **Start export** with no character loaded — should be blocked with a
  clear message ("Pick a character to enable export").
- Try to load a project mid-export — should be refused with "Stop the export
  before loading a project".

## Automated

```bash
npm test
```

Currently covers `pickVideoMimeType` codec fallback (Node + mocked
`MediaRecorder`).
