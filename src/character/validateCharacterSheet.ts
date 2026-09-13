import { CHARACTER_SHEET_V1 } from "../config/characterSheetV1";
import type { ValidationResult } from "../types/character";

export async function validateCharacterSheet(file: File): Promise<ValidationResult> {
  const spec = CHARACTER_SHEET_V1;

  if (file.type !== spec.mimeType) {
    return { ok: false, message: "PNG画像を選択してください。" };
  }

  if (file.size > spec.maxFileSizeBytes) {
    return { ok: false, message: "ファイルサイズは10MB以下にしてください。" };
  }

  try {
    // MIME metadata alone does not establish the file's actual format.
    const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!pngSignature.every((byte, index) => signature[index] === byte)) {
      return { ok: false, message: "PNG画像を選択してください。" };
    }

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
    return { ok: false, message: "この画像は読み込めませんでした。2048×2048pxのPNG画像を使用してください。" };
  }
}
