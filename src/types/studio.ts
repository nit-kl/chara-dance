import type { ParsedCharacter } from "./character";

export type MotionOption = { id: string; name: string; path: string };
export type BackgroundOption = { id: string; name: string; color: number; alpha: number; checker: boolean };
export type CharacterSheetState = {
  selectedFile: File | null;
  parsedCharacter: ParsedCharacter | null;
  phase: "idle" | "fetching" | "validating" | "parsing" | "ready" | "error";
  error: string | null;
};
