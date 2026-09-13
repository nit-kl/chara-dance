import type { BackgroundOption } from "../types/studio";
import { CHARACTER_PREVIEW } from "./characterPreview";

export const BACKGROUNDS: readonly BackgroundOption[] = [
  { id: "dark", name: "Dark", color: CHARACTER_PREVIEW.background, alpha: 1, checker: false },
  { id: "light", name: "Light", color: 0xeef1f7, alpha: 1, checker: false },
  { id: "transparent", name: "Transparent Checker", color: 0x000000, alpha: 0, checker: true },
];
