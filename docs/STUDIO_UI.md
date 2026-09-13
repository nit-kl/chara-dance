# Dance Studio — Milestone 05

The main view places Character Preview beside the controls on desktop. At widths
of 900px or less, Preview, Controls and Upload are stacked in DOM order.
The existing Part Preview is mounted inside a closed `details` panel.

## State ownership

- `useCharacterSheet`: current File, ParsedCharacter, validation/parser phase and
  error. A request id prevents old asynchronous results from replacing a new file.
- `useDanceStudio`: selected MotionOption, background, speed, playback snapshot,
  renderer/motion loading phases and retry state. The Renderer is owned through a
  ref and destroyed on character replacement or unmount. Motion loads are aborted
  and stale completions ignored on motion/file changes.
- `AnimationPlayer`: unchanged domain playback, time, interpolation and transforms.
  UI controls call Renderer methods; the UI does not calculate animation frames.

Dance, speed and background choices persist across character replacement. Playback
always stops and resets to zero. Motion changes use the existing renderer and
reset playback; background and speed changes do not restart playback.

## Configuration

- `src/config/motions.ts`: two bundled motions, each with id, name and local path.
- `src/config/backgrounds.ts`: Dark, Light and Transparent Checker options.
- `src/config/animationPreview.ts`: speed choices and playback status frequency.

Pixi is initialized with alpha support. Background changes update the renderer's
clear color and alpha. Transparent Checker uses a transparent Canvas over a CSS
checker pattern, with no image URLs or additional textures. This is a preview;
recording and export are outside Milestone 05.

Milestone 06 adds an Export section to the same controls panel. Recording state is
owned by `RecordingSession`, exposed by `useDanceStudio`, and shared with App to
lock upload synchronously. Playback calculations remain outside React. The checker
is rendered inside Pixi only while recording so it appears in the video. See
[WEBM_EXPORT.md](./WEBM_EXPORT.md) for lifecycle, locking and background behavior.

## User states

The empty view offers PNG selection and format requirements. Validation, parsing,
skeleton initialization and motion loading have visible status messages. File and
renderer failures offer re-selection; motion failures offer retry or another dance.
Errors contain no stack traces. Playback is disabled until the selected motion and
renderer are ready. Native controls, input labels, pressed states, visible focus
outlines and the native details/summary keyboard behavior support keyboard use.

## Milestone 07 polish

The empty preview offers the bundled Sample as the primary action and upload as
the secondary action. Three short steps show progress toward saving a video.
Sample loading shares the standard validation/parser path, with abort and stale
request guards. A successful sample selection resets studio preferences by mounting
the preview for that new character; ordinary controls never rebuild the character.
Upload settings continue to persist. The template is linked below Upload, before
the initially closed Debug panel. Export progress, success, save and retry actions
use user-facing Japanese copy. See [USER_FLOW.md](./USER_FLOW.md).
