# Browser checks

Run `npm run dev`, then open these paths on the local Vite URL:

- `/tests/validation.html`: Milestone 01 PNG validation (12 checks).
- `/tests/parser.html`: Milestone 02 parser and upload UI (10 checks).
- `/tests/skeleton.html`: Milestone 03 skeleton and real PixiJS/WebGL rendering
  (12 checks; requires WebGL). Leaves one test character visible after completion.

Each page ends with `PASS: N checks` or `FAIL: ...`. No test dependencies are required.
The parser checks compare every output pixel against its configured source region,
including transparency, and verify dimensions, pivots, bitmap release on success
and failures, re-upload, overlapping requests, and recovery after a parser error.
The UI runs in React StrictMode. Failure injection is confined to the test page.

For visual inspection, open the app, download its template PNG, and select it.
Confirm all 10 cards show an image, name, size, and pivot, with two columns on
desktop and one column at viewport widths of 640px or less. Select another file
to confirm the previous preview clears and the new result appears.

Skeleton checks cover the 10 textures and bones, parent/child transforms,
configured pivots and attachments, GPU pixel checks for all ten draw layers,
desktop/tablet/mobile fit, canvas reuse on resize, repeated uploads in StrictMode,
texture/source/container/application/observer cleanup, unmount during initialization,
and recovery from initialization failures. Test artwork is drawn locally by
`skeletonFixture.ts`; it is not part of the product or sent to a server.
Inspect the final character at desktop and mobile viewport widths, along with
the Part Preview underneath. The original template may contain no visible art.
