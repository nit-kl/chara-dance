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

export type ValidationResult =
  | { ok: true; width: number; height: number }
  | { ok: false; message: string };

export type ParsedPart = {
  name: BoneName;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pivot: Pivot;
};

export type ParsedCharacter = {
  parts: Record<BoneName, ParsedPart>;
};
