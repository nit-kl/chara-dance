export type BoneName =
  | "head"
  | "body"
  | "leftUpperArm"
  | "rightUpperArm"
  | "leftLowerArm"
  | "rightLowerArm"
  | "leftUpperLeg"
  | "rightUpperLeg"
  | "leftLowerLeg"
  | "rightLowerLeg";

export type Pivot = {
  x: number;
  y: number;
};

export type CharacterPartSpec = {
  x: number;
  y: number;
  width: number;
  height: number;
  pivot: Pivot;
};

export type CharacterSheetSpec = {
  width: number;
  height: number;
  maxFileSizeBytes: number;
  mimeType: "image/png";
  parts: Record<BoneName, CharacterPartSpec>;
};
