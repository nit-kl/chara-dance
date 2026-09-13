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
- All bone rotations are zero and scales are one. Only the root is scaled and
  translated to fit the preview. Art must already be oriented for a neutral pose.

The body carries the head, upper arms, and upper legs. Each upper arm carries
its lower arm; each upper leg carries its lower leg. Sprite drawing is ordered
independently using a PixiJS RenderLayer: upper arms, upper legs, lower legs,
body, lower arms, head (left before right within each pair).

Auto fit includes the entire part rectangles, including transparent padding,
within 70% of preview width and 85% of height. It does not detect image content.
Rendering uses existing local canvases; it performs no network or storage writes.
