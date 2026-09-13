# WebM Export — Milestone 06

Export runs entirely in the browser, with no new dependencies or image uploads.
The actual Pixi canvas is captured; there is no per-frame canvas copy.

## Ownership and flow

- `VideoExporter` owns MediaRecorder, its event handlers, captured tracks, chunks,
  the resulting Blob and one object URL. It exposes start, stop, cancel and support
  detection. MIME negotiation tries VP9, VP8, then plain WebM using
  `MediaRecorder.isTypeSupported()`.
- `RecordingSession` coordinates playback and recording, progress, cancellation,
  speed restoration and result invalidation. React only renders its state and
  invokes commands through `useDanceStudio`.
- `CharacterRenderer.getCanvas()` returns the initialized live canvas.
  Recording pauses and resets playback, saves speed, temporarily uses 1x, and
  renders the initial frame. The MediaRecorder start event starts playback once.
  The existing Pixi ticker advances animation using elapsed seconds; reaching the
  motion duration clamps the final pose and triggers recorder stop after two frames.
  Normal loop playback remains unchanged.

`src/config/export.ts` centralizes 30 fps, MIME preference, the two-frame ending
margin, timeout guards and checker colors/tile size. The recorder stop event builds
a non-empty WebM Blob. The ready UI provides a local download with an ASCII slug.
The URL remains available for repeated downloads until the result is cleared.

## Background and interaction

Dark and Light use the current Pixi clear color. Transparent Checker temporarily
adds opaque checker Graphics behind the character inside the same canvas; this
exports the checker pattern, not transparent video. Preview transparency is restored.
Canvas dimensions remain fixed during recording; normal responsive resize resumes
afterwards. Export uses the preview resolution without a resolution selector.

Upload, dance, background, speed, playback and repeated export are disabled while
recording. Command handlers also guard recording state. Completion stops playback,
restores Neutral Pose and the user's speed, and unlocks controls. Cancel does the
same without retaining a Blob or generating a URL. Switching characters, dances
or backgrounds clears a previous result. Recording is cancelled when the page
becomes hidden, since background tabs cannot reliably advance a real-time ticker.

## Cleanup and limitations

Completion, failure, cancellation and unmount detach recorder handlers, stop every
capture track, drop chunks/recorder/stream references and clear timers. Re-export,
result invalidation and unmount revoke the previous URL and release its Blob.
Renderer cleanup retains its existing ticker, texture and application disposal.
Timeouts guard a stalled animation or missing recorder stop event; ordinary
completion is based on animation duration rather than a single timeout.

Unsupported capture, MediaRecorder or WebM MIME types show a user message.
Recorder construction/start/stop errors and empty output also produce UI errors.
This is real-time browser recording: frame rate and exact encoded length depend
on browser scheduling and device performance. The test suite checks real Chrome
output by decoding and playing its frames; other browser engines require their
own compatibility checks. MP4, transparent WebM and audio are outside this milestone.

API references: [canvas captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)
and [MediaRecorder stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop).
