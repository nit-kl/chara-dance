import type { BoneName } from "../types/character";
import type { BoneAttachment } from "../types/skeleton";

// Parent part coordinates normalized from its top-left; root coordinates are px.
// See docs/SKELETON_V1.md. Pivots remain exclusively in characterSheetV1.ts.
export const SKELETON_V1: Record<BoneName, BoneAttachment> = {
  body: { parent: "root", x: 0, y: 0 },
  head: { parent: "body", x: 0.5, y: 0.08 },
  leftUpperArm: { parent: "body", x: 0.39, y: 0.20 },
  rightUpperArm: { parent: "body", x: 0.61, y: 0.20 },
  leftLowerArm: { parent: "leftUpperArm", x: 0.70, y: 0.40 },
  rightLowerArm: { parent: "rightUpperArm", x: 0.30, y: 0.40 },
  leftUpperLeg: { parent: "body", x: 0.38, y: 0.9 },
  rightUpperLeg: { parent: "body", x: 0.62, y: 0.9 },
  leftLowerLeg: { parent: "leftUpperLeg", x: 0.5, y: 0.9 },
  rightLowerLeg: { parent: "rightUpperLeg", x: 0.5, y: 0.9 },
};

export const SKELETON_DRAW_ORDER: readonly BoneName[] = [
  "leftUpperArm", "rightUpperArm", "leftUpperLeg", "rightUpperLeg",
  "leftLowerLeg", "rightLowerLeg", "body", "leftLowerArm", "rightLowerArm", "head",
];
