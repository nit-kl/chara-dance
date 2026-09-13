import { validateCharacterSheet } from "../src/character/validateCharacterSheet";
import { CHARACTER_SHEET_V1 as spec } from "../src/config/characterSheetV1";

// Run with Vite at /tests/validation.html. Uses the real browser PNG decoder.
const output = document.querySelector<HTMLPreElement>("#results")!;
const results: string[] = [];

async function image(width: number, height: number, type = "image/png") {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Encoding failed")), type);
  });
}

async function check(name: string, file: File, expected: boolean) {
  const result = await validateCharacterSheet(file);
  if (result.ok !== expected) throw new Error(`${name}: ${JSON.stringify(result)}`);
  results.push(`PASS ${name}`);
}

async function run() {
  const png = await image(spec.width, spec.height);
  const file = (parts: BlobPart[], type = spec.mimeType) =>
    new File(parts, "sheet.png", { type });
  await check("valid transparent PNG", file([png]), true);
  await check("incorrect MIME", new File([png], "sheet.png", { type: "image/jpeg" }), false);
  await check("empty MIME", new File([png], "sheet.png"), false);
  await check("empty file", file([]), false);
  await check("incorrect width", file([await image(1, spec.height)]), false);
  await check("incorrect height", file([await image(spec.width, 1)]), false);
  await check("exact size limit", file([png, new Uint8Array(spec.maxFileSizeBytes - png.size)]), true);
  await check("over size limit", file([png, new Uint8Array(spec.maxFileSizeBytes - png.size + 1)]), false);
  await check("JPEG disguised as PNG", file([await image(spec.width, spec.height, "image/jpeg")]), false);
  await check("truncated PNG", file([png.slice(0, 33)]), false);
  await check("text disguised as PNG", file(["not an image"]), false);
  const template = await fetch("/templates/character-sheet-v1.png");
  if (!template.ok) throw new Error("Template is missing");
  await check("repository template", file([await template.blob()]), true);
  output.textContent = `${results.join("\n")}\nPASS: ${results.length} checks`;
}

run().catch((error: unknown) => {
  output.textContent = `${results.join("\n")}\nFAIL: ${String(error)}`;
});
