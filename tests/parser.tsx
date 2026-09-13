import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../src/App";
import { parseCharacterSheet } from "../src/character/CharacterSheetParser";
import { CHARACTER_SHEET_V1 as spec } from "../src/config/characterSheetV1";

const output = document.querySelector<HTMLPreElement>("#results")!;
const results: string[] = [];
const pause = () => new Promise((resolve) => setTimeout(resolve, 20));
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function until(predicate: () => boolean) {
  for (let i = 0; i < 250; i++) {
    if (predicate()) return;
    await pause();
  }
  throw new Error("UI timeout");
}
function pass(message: string) { results.push(`PASS ${message}`); }
async function rejects(work: () => Promise<unknown>) {
  let rejected = false;
  try { await work(); } catch { rejected = true; }
  assert(rejected, "Expected parser rejection");
}
const cards = () => document.querySelectorAll(".partCard");
function select(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function run() {
  const source = document.createElement("canvas");
  source.width = spec.width;
  source.height = spec.height;
  const context = source.getContext("2d")!;
  const pixels = context.createImageData(source.width, source.height);
  // Every source position has a distinct RGB value; alpha also tests transparency.
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const index = (y * source.width + x) * 4;
      pixels.data.set([x % 256, y % 256, Math.floor(x / 256) + Math.floor(y / 256) * 8,
        (x + y) % 19 === 0 ? 0 : 255], index);
    }
  }
  context.putImageData(pixels, 0, 0);
  const blob = await new Promise<Blob>((resolve) => source.toBlob((value) => resolve(value!)));
  const file = new File([blob], "first.png", { type: "image/png" });
  const second = new File([blob], "second.png", { type: "image/png" });
  const originalDecode = window.createImageBitmap;
  let closed = 0;
  window.createImageBitmap = (async (image: ImageBitmapSource) => {
    const bitmap = await originalDecode(image);
    const close = bitmap.close.bind(bitmap);
    bitmap.close = () => { closed++; close(); };
    return bitmap;
  }) as typeof createImageBitmap;

  try {
    const parsed = await parseCharacterSheet(file);
    assert(Object.keys(parsed.parts).length === 10, "Expected 10 parts");
    for (const part of Object.values(parsed.parts)) {
      const region = spec.parts[part.name];
      assert(part.width === region.width && part.height === region.height, "Metadata size");
      assert(part.canvas.width === region.width && part.canvas.height === region.height, "Canvas size");
      assert(part.pivot.x === region.pivot.x && part.pivot.y === region.pivot.y, "Pivot");
      const actual = part.canvas.getContext("2d")!.getImageData(0, 0, part.width, part.height).data;
      const expected = context.getImageData(region.x, region.y, region.width, region.height).data;
      assert(actual.every((value, i) => value === expected[i]), `${part.name} pixel mismatch`);
    }
    assert(closed === 1, "Successful parser must close bitmap");
    pass("10 parts: exact pixels, sizes, pivots and bitmap release");

    await rejects(() => parseCharacterSheet(new File(["broken"], "broken.png")));
    pass("decode failure rejects");
    const originalContext = HTMLCanvasElement.prototype.getContext;
    try {
      HTMLCanvasElement.prototype.getContext = () => null;
      await rejects(() => parseCharacterSheet(file));
      assert(Number(closed) === 2, "Canvas failure must close bitmap");
    } finally { HTMLCanvasElement.prototype.getContext = originalContext; }
    pass("canvas failure rejects and releases bitmap");
    const originalDraw = CanvasRenderingContext2D.prototype.drawImage;
    try {
      CanvasRenderingContext2D.prototype.drawImage = () => { throw new Error("Forced drawing failure"); };
      await rejects(() => parseCharacterSheet(file));
      assert(Number(closed) === 3, "Drawing failure must close bitmap");
    } finally { CanvasRenderingContext2D.prototype.drawImage = originalDraw; }
    pass("drawing failure rejects and releases bitmap");

    const root = createRoot(document.querySelector("#test-app")!);
    root.render(<StrictMode><App /></StrictMode>);
    await until(() => !!document.querySelector("input"));
    select(file);
    await until(() => cards().length === 10 && !!document.querySelector(".partImage canvas"));
    assert(document.querySelectorAll(".partImage canvas").length === 10, "Visible canvas count");
    pass("upload shows all 10 canvases in StrictMode");

    const previous = document.querySelector(".partImage canvas")!;
    select(second);
    await until(() => !previous.isConnected);
    await until(() => cards().length === 10 && document.querySelector(".statusCard")!.textContent!.includes("second.png"));
    assert(document.querySelector(".partImage canvas") !== previous, "Old canvas retained");
    pass("re-upload replaces old canvases and filename");

    let count = 0;
    let delayedFinished = false;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    window.createImageBitmap = (async (image: ImageBitmapSource) => {
      const delayed = ++count === 2;
      if (delayed) await gate; // Delay first selection's parser, after validation.
      const bitmap = await originalDecode(image);
      if (delayed) delayedFinished = true;
      return bitmap;
    }) as typeof createImageBitmap;
    select(file);
    await until(() => count === 2);
    assert(cards().length === 0, "Old parts visible while parsing");
    select(second);
    await until(() => cards().length === 10);
    release();
    await until(() => delayedFinished);
    await pause(); await pause();
    assert(document.querySelector(".statusCard")!.textContent!.includes("second.png"), "Stale result won");
    pass("overlapping selection ignores stale parser result");

    count = 0;
    window.createImageBitmap = (async (image: ImageBitmapSource) => {
      if (++count === 2) throw new Error("Forced parser decode failure");
      return originalDecode(image);
    }) as typeof createImageBitmap;
    select(file);
    await until(() => !!document.querySelector(".message.error"));
    assert(cards().length === 0 && !!document.querySelector("input"), "Parser error crashed app or kept old parts");
    pass("parser error is displayed without crashing or stale parts");
    window.createImageBitmap = originalDecode;
    select(file);
    await until(() => cards().length === 10);
    pass("same file can be selected again after parser failure");
    select(new File(["invalid"], "invalid.png", { type: "image/png" }));
    await until(() => !!document.querySelector(".message.error"));
    assert(cards().length === 0, "Invalid upload kept old parts");
    pass("invalid re-upload clears preview");
    root.unmount();
  } finally { window.createImageBitmap = originalDecode; }
  output.textContent = `${results.join("\n")}\nPASS: ${results.length} checks`;
}

run().catch((error: unknown) => {
  output.textContent = `${results.join("\n")}\nFAIL: ${String(error)}`;
});
