import { CHARACTER_SHEET_V1 } from "../config/characterSheetV1";

export type ValidationResult =
  | { ok: true; width: number; height: number }
  | { ok: false; message: string };

export async function validateCharacterSheet(file: File): Promise<ValidationResult> {
  const spec = CHARACTER_SHEET_V1;

  if (file.type !== spec.mimeType) {
    return { ok: false, message: "PNG画像を選択してください。" };
  }

  if (file.size > spec.maxFileSizeBytes) {
    return { ok: false, message: "ファイルサイズは10MB以下にしてください。" };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const result =
      bitmap.width === spec.width && bitmap.height === spec.height
        ? { ok: true as const, width: bitmap.width, height: bitmap.height }
        : {
            ok: false as const,
            message: `画像サイズは${spec.width}×${spec.height}pxにしてください。現在: ${bitmap.width}×${bitmap.height}px`,
          };

    bitmap.close();
    return result;
  } catch {
    return { ok: false, message: "画像を読み込めませんでした。" };
  }
}
