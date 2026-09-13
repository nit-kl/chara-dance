# Skeleton v1 — Neutral Pose

Milestone 03 connects the existing parts without changing Character Sheet v1.
`src/config/skeletonV1.ts` owns attachments and draw order. These are adjustable
neutral-pose defaults, not inferred joints or changes to the input format.

- `body` is attached to `root` at (0, 0), in pixels.
- Every other attachment is a normalized location in the **parent's original
  part rectangle**, measured from its top-left (x rightward, y downward).
- The assembler subtracts the parent's existing normalized pivot and multiplies
  by the parent's configured size to obtain a position relative to its joint.
- Each bone Container's origin is its joint. Its Sprite anchor uses the pivot
  from `characterSheetV1.ts`. Child Containers therefore inherit joint transforms.
- In Neutral Pose all bone rotations are zero and scales are one. Only the root is scaled and
  translated to fit the preview. Art must already be oriented for a neutral pose.

The body carries the head, upper arms, and upper legs. Each upper arm carries
its lower arm; each upper leg carries its lower leg. Sprite drawing is ordered
independently using a PixiJS RenderLayer: upper arms, upper legs, lower legs,
body, lower arms, head (left before right within each pair).

Auto fit includes the entire part rectangles, including transparent padding,
within 70% of preview width and 85% of height. It does not detect image content.
Rendering uses existing local canvases; it performs no network or storage writes.

Milestone 04 preserves this neutral framing during playback and resize. Motion
offsets are applied relative to the bone connections; they do not alter the root
fit or attachment configuration. Reset restores the complete Neutral Pose.

## Human-proportion arm attachments

With user approval, the supplied idol sample replaces the robot as the default.
Shoulder attachments are now (0.39, 0.20) and (0.61, 0.20) in the body rectangle;
elbows are (0.70, 0.40) and (0.30, 0.40) in their upper-arm rectangles. These shared
defaults shorten the arm span to avoid stretching human artwork. They apply to
every sheet, not just the sample. Existing sheets drawn for the earlier long arms
may need their arm artwork repositioned. Part regions, pivots, hierarchy, neutral
rotation/scale and motion offsets are unchanged.
