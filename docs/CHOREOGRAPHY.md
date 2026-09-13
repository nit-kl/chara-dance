# Authored idol-style choreography

The bundled dances use all ten bones instead of synchronized upper-arm oscillation.
Cute Dance is a four-second / eight-count phrase: step-touch, face-framing gesture,
alternating diagonal reaches, open accent and return. Gentle Sway uses a smaller
side-to-side groove. Both loop continuously without changing the Motion v1 schema.

`tools/choreograph.mjs` authors poses and samples periodic cubic B-splines at 60 samples
per second into ordinary JSON keyframes. This is data sampling, not 60fps export;
WebM remains 30fps. Runtime interpolation remains linear. Head and forearm tracks
follow the torso/shoulders with small time offsets instead of moving in lockstep.
Neighboring poses guide a continuous curve with continuous velocity and acceleration,
including the loop seam. Poses are softened rather than reached with a full stop
every quarter second. No body scaling
or per-limb position offsets are used, so joints remain connected.

During authoring only, forward transforms of the authored legs determine the
lowest sole height. Body y compensates that height so the planted foot stays near
the neutral floor. A smooth maximum with a 0.75px smoothing width blends the sole
heights at contact changes, limiting the authoring-space floor gap to 0.375px
while avoiding an abrupt vertical velocity change. This does not solve bone angles, implement IK, simulate physics
or run a new per-frame system in the application. Horizontal foot placement remains
authored; this is not a full contact solver.

Generate with Node.js 22.18+ (native TypeScript type stripping):

```sh
node tools/choreograph.mjs
```

The result is stylized 2D idol-inspired motion, not captured motion from a real
performer. Ten flat parts cannot express torso twisting, forward/backward turns,
finger gestures, facial changes or cloth/hair dynamics. No inference service,
external footage, backend or new library is introduced.
