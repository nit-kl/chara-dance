# Supplied idol sample

Source: the user-supplied `ChatGPT Image 2026年9月13日 11_22_15.png` (1254×1254).
A copy is preserved in `tools/source-idol.png`. No external service is used.

`tools/prepare-idol.html` converts manually identified source regions into a
2048×2048 PNG, available at `public/samples/sample-idol.png`. Runtime image
processing, sheet regions and pivots remain unchanged.

The previous skeleton's arm joints were too far apart for this artwork. Stretching
the image to those joints caused severe distortion. With explicit user approval,
the following shared attachments are applied in `src/config/skeletonV1.ts`:

| Bone | x | y |
| --- | --- | --- |
| leftUpperArm | 0.39 | 0.20 |
| rightUpperArm | 0.61 | 0.20 |
| leftLowerArm | 0.70 | 0.40 |
| rightLowerArm | 0.30 | 0.40 |

These defaults apply to all character sheets. The converter reads joint targets
from the shared config; source image crop regions are manually defined only in
the development tool. Masks exclude neighboring thighs from the forearm crops and
duplicate sleeves from the torso. Source artwork is otherwise retained, with scale
and orientation adjusted to fit the fixed sheet. The original source is preserved.

`src/config/sample.ts` selects `sample-idol.png`. The same validator, parser,
assembler and renderer are used for samples and user uploads. The robot asset and
its generator remain available as development material but are not selected.
