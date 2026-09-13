import type { CharacterSheetSpec } from "../types/character";

export const CHARACTER_SHEET_V1: CharacterSheetSpec = {
  width: 2048,
  height: 2048,
  maxFileSizeBytes: 10 * 1024 * 1024,
  mimeType: "image/png",
  parts: {
    head: { x: 0, y: 0, width: 1024, height: 512, pivot: { x: 0.5, y: 0.85 } },
    body: { x: 1024, y: 0, width: 1024, height: 512, pivot: { x: 0.5, y: 0.5 } },
    leftUpperArm: { x: 0, y: 512, width: 1024, height: 384, pivot: { x: 0.85, y: 0.15 } },
    rightUpperArm: { x: 1024, y: 512, width: 1024, height: 384, pivot: { x: 0.15, y: 0.15 } },
    leftLowerArm: { x: 0, y: 896, width: 1024, height: 384, pivot: { x: 0.85, y: 0.15 } },
    rightLowerArm: { x: 1024, y: 896, width: 1024, height: 384, pivot: { x: 0.15, y: 0.15 } },
    leftUpperLeg: { x: 0, y: 1280, width: 1024, height: 384, pivot: { x: 0.65, y: 0.1 } },
    rightUpperLeg: { x: 1024, y: 1280, width: 1024, height: 384, pivot: { x: 0.35, y: 0.1 } },
    leftLowerLeg: { x: 0, y: 1664, width: 1024, height: 384, pivot: { x: 0.5, y: 0.1 } },
    rightLowerLeg: { x: 1024, y: 1664, width: 1024, height: 384, pivot: { x: 0.5, y: 0.1 } }
  }
};
