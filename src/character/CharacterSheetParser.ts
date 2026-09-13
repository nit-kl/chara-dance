import { CHARACTER_SHEET_V1 } from "../config/characterSheetV1";
import type { BoneName } from "../types/character";

export type ParsedPart = {
  name: BoneName;
  canvas: HTMLCanvasElement;
};

export type ParsedCharacter = {
  parts: Record<BoneName, ParsedPart>;
};

export async function parseCharacterSheet(file: File): Promise<ParsedCharacter> {
  const bitmap = await createImageBitmap(file);
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
      bitmap.close();
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

    parts[name] = { name, canvas };
  }

  bitmap.close();
  return { parts };
}
