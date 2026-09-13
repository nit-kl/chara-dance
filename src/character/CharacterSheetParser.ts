import { CHARACTER_SHEET_V1 } from "../config/characterSheetV1";
import type { BoneName, ParsedCharacter, ParsedPart } from "../types/character";

export async function parseCharacterSheet(file: File): Promise<ParsedCharacter> {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width !== CHARACTER_SHEET_V1.width || bitmap.height !== CHARACTER_SHEET_V1.height) {
      throw new Error("Character sheet dimensions do not match the config.");
    }
    const entries = Object.entries(CHARACTER_SHEET_V1.parts) as [
      BoneName,
      (typeof CHARACTER_SHEET_V1.parts)[BoneName]
    ][];

    const parts = {} as Record<BoneName, ParsedPart>;

    for (const [name, spec] of entries) {
      const canvas = document.createElement("canvas");
      canvas.width = spec.width;
      canvas.height = spec.height;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas 2D context is unavailable.");
      }

      context.drawImage(
        bitmap,
        spec.x,
        spec.y,
        spec.width,
        spec.height,
        0,
        0,
        spec.width,
        spec.height
      );

      parts[name] = { name, canvas, width: spec.width, height: spec.height, pivot: { ...spec.pivot } };
    }

    return { parts };
  } finally {
    bitmap.close();
  }
}
