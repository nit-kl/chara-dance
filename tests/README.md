# Browser checks

Run `node tests/motion-smoothness.mjs` for bundled motion loop continuity and
angular speed/acceleration limits, including the loop seam. This needs no browser.

Run `npm run dev`, then open these paths on the local Vite URL:

- `/tests/validation.html`: Milestone 01 PNG validation (12 checks).
- `/tests/parser.html`: Milestone 02 parser and upload UI (10 checks).
- `/tests/skeleton.html`: Milestone 03 skeleton and real PixiJS/WebGL rendering
  (12 checks; requires WebGL). Leaves one test character visible after completion.
- `/tests/animation.html`: Milestone 04 motion validation, interpolation and real
  playback controls (19 checks, including 20 invalid data cases; requires WebGL).
  Leaves the sample playing for visual inspection. Pause and Reset are available.
- `/tests/studio.html`: Milestone 05 user-facing studio (11 checks; requires WebGL).
  Leaves the studio mounted for viewport and keyboard inspection.
- `/tests/export.html`: Milestone 06 recording (12 checks; requires WebGL and real
  WebM MediaRecorder/captureStream support). Allow approximately 25 seconds.
  Leaves a downloadable verified WebM and a decoded frame for visual inspection.
- `/tests/polish.html`: Milestone 07 onboarding and real bundled sample (9 checks;
  requires WebGL and WebM recording). Allow approximately 25 seconds. Leaves the
  sample ready for keyboard and mobile inspection.
- `/tests/choreography.html`: authored dance quality constraints (4 checks).
  Verifies both dances move all ten bones, loop without a pose discontinuity,
  retain connected rigid limbs, and maintain sole height through actual Pixi
  transforms at 120 time samples per second. Leaves an eight-pose contact sheet.

Each page ends with `PASS: N checks` or `FAIL: ...`. No test dependencies are required.
The parser checks compare every output pixel against its configured source region,
including transparency, and verify dimensions, pivots, bitmap release on success
and failures, re-upload, overlapping requests, and recovery after a parser error.
The UI runs in React StrictMode. Failure injection is confined to the test page.

For visual inspection, open the app and select a local character sheet (the
repository template is available at `public/templates/character-sheet-v1.png`).
Expand Advanced / Debug to inspect the parts.
Confirm all 10 cards show an image, name, size, and pivot, with two columns on
desktop and one column at viewport widths of 540px or less. Select another file
to confirm the previous preview clears and the new result appears.

Skeleton checks cover the 10 textures and bones, parent/child transforms,
configured pivots and attachments, GPU pixel checks for all ten draw layers,
desktop/tablet/mobile fit, canvas reuse on resize, repeated uploads in StrictMode,
texture/source/container/application/observer cleanup, unmount during initialization,
and recovery from initialization failures. Test artwork is drawn locally by
`skeletonFixture.ts`; it is not part of the product or sent to a server.
Inspect the final character at desktop and mobile viewport widths, along with
the Part Preview underneath. The original template may contain no visible art.

Animation checks cover time boundaries, all five transform properties, degree to
radian conversion, neutral defaults, connection offsets, loop/non-loop playback,
pause/reset/speed, safe motion switching, owned motion data, actual Pixi Ticker
updates, re-upload/unmount cleanup and aborted/stale motion loads. Invalid JSON,
HTTP errors and invalid motion data are tested without adding a test framework.

Studio checks cover empty state, all loading stages, invalid PNG/dimensions,
parser/renderer/motion errors and retry, motion selection, playback, selected speed,
actual GPU clear pixels for all backgrounds (including alpha), re-upload,
preferences, Debug open/close, and focus visibility. The existing animation test
uses the new speed button and compares numeric time instead of presentation text.

For responsive checks, use 1440, 1024, 768 and 390px viewport widths. Confirm no
horizontal overflow, side-by-side Preview/Controls on desktop, and vertical
Preview/Controls/Upload order on smaller screens. Use Tab from the header to Dance
and Play; Enter activates Play. Tab to Advanced / Debug and press Enter to toggle
it. Focus must have a visible outline. No test framework or dependency was added.

Export checks cover capability and MIME fallback, recorder construction/start/stop
and asynchronous errors, empty output, stop timeout, missing canvas, event/track
cleanup and URL replacement. Real recordings verify capture of the preview at
30 fps, reset from ongoing playback, 1x export with speed restoration, one motion
duration, UI locking, Cancel, character/dance invalidation and unmount. The WebM is
played to completion and decoded frames are checked for moving character pixels,
opaque checker tiles and Light background. Unsupported UI is tested through
temporary failure injection. No server upload or encoder dependency is used.

Polish checks cover sample defaults, normal parsing, Play/Reset, sample/user image
switches, a stale sample fetch, template retrieval, onboarding/privacy, real sample
export, success/error/cancel, sample lock, URL cleanup, Debug and focus/tap targets.
They assert no additional image decoding or Pixi initialization during background,
speed, dance or export operations. Existing tests retain their assertions, with
selectors updated only for the revised user-facing wording.

At 390px also inspect the initial empty state: Sample and Upload must both fit
inside the preview. Tab/Enter should activate Sample, Play, Save and Debug using
native keyboard behavior. Check 1440, 1024, 768 and 390px for horizontal overflow.
