import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Application } from "pixi.js";
import App from "../src/App";
import { SAMPLE_CHARACTER } from "../src/config/sample";
import { MOTIONS } from "../src/config/motions";
import { skeletonFixture } from "./skeletonFixture";

const output = document.querySelector("#results")!;
const results: string[] = [];
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function pass(message: string) { results.push(`PASS ${message}`); output.textContent = results.join("\n"); }
const delay = () => new Promise((resolve) => setTimeout(resolve, 20));
async function until(predicate: () => boolean) {
  for (let i = 0; i < 600; i++) { if (predicate()) return; await delay(); }
  throw new Error("Polish timeout");
}
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === text)!;
const sample = () => document.querySelector<HTMLButtonElement>("[data-sample]")!.click();
const ready = () => !!button("Play") && !button("Play").disabled;
const download = () => document.querySelector<HTMLAnchorElement>(".downloadButton");
async function loadSample() {
  const previous = document.querySelector(".characterCanvas canvas");
  sample();
  await until(() => ready() && document.querySelector(".characterCanvas canvas") !== previous
    && document.querySelector(".statusCard")!.textContent === SAMPLE_CHARACTER.filename);
}
function upload(file: File) {
  const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
  const data = new DataTransfer(); data.items.add(file); input.files = data.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
function dance(id: string) {
  const select = document.querySelector<HTMLSelectElement>("#dance-select")!;
  select.value = id; select.dispatchEvent(new Event("change", { bubbles: true }));
}

async function run() {
  const originalInit = Application.prototype.init, originalFetch = window.fetch;
  const originalURL = URL.revokeObjectURL, originalStart = MediaRecorder.prototype.start;
  const originalDecode = window.createImageBitmap;
  const apps: Application[] = [], revoked = new Set<string>();
  let decodes = 0;
  Application.prototype.init = async function (...args) { apps.push(this); return originalInit.apply(this, args); };
  window.createImageBitmap = (async (source: ImageBitmapSource) => { decodes++; return originalDecode(source); }) as typeof createImageBitmap;
  URL.revokeObjectURL = (url) => { revoked.add(url); originalURL(url); };
  const root = createRoot(document.querySelector("#test-app")!);
  try {
    root.render(<StrictMode><App /></StrictMode>);
    await until(() => !!document.querySelector(".emptyState"));
    assert(document.querySelector(".emptyState .primaryButton[data-sample]"), "Missing primary sample");
    assert(document.querySelectorAll(".onboarding li").length === 3 && document.querySelector('.onboarding [aria-current]')!.textContent!.includes("キャラクター"), "Onboarding initial step");
    assert(document.querySelector(".privacyNote")!.textContent!.includes("サーバーへアップロードされません"), "Privacy absent");
    const template = document.querySelector<HTMLAnchorElement>(".templateDownload")!;
    const templateResponse = await originalFetch(template.href);
    assert(template.download && templateResponse.ok && (await templateResponse.blob()).type === "image/png", "Template download");
    pass("first experience has primary Sample, three steps, privacy and a downloadable PNG template");

    await loadSample();
    assert(decodes >= 2 && document.querySelectorAll(".partImage canvas").length === 10, "Sample bypassed normal decoding/parts");
    assert(document.querySelector(".statusCard")!.textContent === SAMPLE_CHARACTER.filename, "Not bundled sample");
    const app = apps.at(-1)!, canvas = app.canvas, oldStage = app.stage, before = apps.length, decoded = decodes;
    assert(!app.ticker.started && document.querySelector<HTMLSelectElement>("#dance-select")!.value === "cute-dance", "Sample initial dance/autoplay");
    assert(document.querySelector('[data-speed="1"][aria-pressed="true"]') && document.querySelector('[data-background="dark"][aria-pressed="true"]'), "Sample defaults");
    const debug = document.querySelector<HTMLDetailsElement>(".debugPanel")!;
    assert(!debug.open, "Debug initially open");
    debug.querySelector("summary")!.click(); assert(debug.open, "Debug open"); debug.querySelector("summary")!.click();
    button("Play").click(); await until(() => parseFloat(document.querySelector("output")!.textContent!) > .1);
    button("Reset").click(); await until(ready);
    assert(app.stage.getChildByLabel("body", true)!.rotation === 0 && !app.ticker.started, "Sample Reset");
    pass("bundled PNG follows normal parser/skeleton, defaults are correct, Play/Reset and Debug work");

    document.querySelector<HTMLButtonElement>('[data-speed="2"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-background="light"]')!.click();
    dance(MOTIONS[1].id); await until(ready);
    button("WebM動画を作成").click(); await until(() => !!button("キャンセル"));
    assert([...document.querySelectorAll<HTMLButtonElement>("[data-sample]")].every((b) => b.disabled), "Sample enabled while recording");
    document.querySelector("[data-sample]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await until(() => !!download());
    assert(document.querySelector(".exportSuccess")?.textContent?.includes("動画ができました"), "Success absent");
    assert(document.querySelector('.onboarding [aria-current]')!.textContent!.includes("動画"), "Export step absent");
    assert((await (await originalFetch(download()!.href)).blob()).size > 1000, "Empty sample WebM");
    assert(apps.length === before && decodes === decoded && app.canvas === canvas, "Controls/export rebuilt character");
    const oldURL = download()!.href;
    button("もう一度作る").click(); await until(() => !!button("キャンセル"));
    assert(revoked.has(oldURL), "Re-export URL leak");
    button("キャンセル").click(); await until(ready);
    pass("sample dance/background/speed/export and re-export work; lock, success, URL cleanup and no rebuild");

    MediaRecorder.prototype.start = () => { throw new Error("technical encoder stack"); };
    button("WebM動画を作成").click(); await until(() => !!document.querySelector(".exportControls [role=alert]"));
    assert(!document.querySelector(".exportControls")!.textContent!.includes("technical"), "Technical export error exposed");
    MediaRecorder.prototype.start = originalStart;
    assert(!document.querySelector<HTMLButtonElement>("[data-sample]")!.disabled, "Failure left locked");
    pass("export error is readable and releases controls");

    const userFile = await skeletonFixture("#ffad70");
    upload(userFile); await until(() => ready() && document.querySelector(".statusCard")!.textContent === userFile.name);
    assert(oldStage.destroyed, "Old sample skeleton retained");
    sample(); await until(() => ready() && document.querySelector(".statusCard")!.textContent === SAMPLE_CHARACTER.filename);
    assert(document.querySelector('[data-speed="1"][aria-pressed="true"]') && document.querySelector('[data-background="dark"][aria-pressed="true"]') && document.querySelector<HTMLSelectElement>("#dance-select")!.value === "cute-dance", "Returning sample did not reset preferences");
    pass("Sample to user upload and back replace resources and restore sample defaults");

    upload(new File(["bad"], "bad.png", { type: "image/png" }));
    await until(() => !!document.querySelector(".previewError"));
    assert(document.querySelector(".previewError")!.textContent!.includes("PNG"), "Upload recovery guidance");
    window.fetch = async (...args) => String(args[0]) === SAMPLE_CHARACTER.path ? new Response("missing", { status: 404 }) : originalFetch(...args);
    sample(); await until(() => !!document.querySelector(".previewError")?.textContent?.includes("サンプルを読み込めません"));
    window.fetch = originalFetch; await loadSample();
    window.fetch = async (...args) => String(args[0]) === MOTIONS[1].path ? new Response("missing", { status: 500 }) : originalFetch(...args);
    dance(MOTIONS[1].id); await until(() => !!document.querySelector(".previewError"));
    assert(document.querySelector(".previewError")!.textContent!.includes("ダンスを読み込めません"), "Motion error copy");
    window.fetch = originalFetch; button("再試行").click(); await until(ready);
    pass("upload, sample HTTP and motion errors offer recovery without technical messages");

    let release!: () => void, requested = false, finished = false;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    window.fetch = async (...args) => {
      if (String(args[0]) === SAMPLE_CHARACTER.path) { requested = true; await gate; finished = true; return originalFetch(SAMPLE_CHARACTER.path); }
      return originalFetch(...args);
    };
    sample(); await until(() => requested);
    assert(document.querySelector(".stageNotice")!.textContent!.includes("サンプルを読み込んで"), "Sample loading absent");
    upload(userFile); await until(ready); release(); await until(() => finished); await delay(); await delay();
    assert(document.querySelector(".statusCard")!.textContent === userFile.name, "Stale sample replaced user selection");
    window.fetch = originalFetch;
    pass("sample loading is visible and a delayed sample cannot replace a newer upload");

    await loadSample();
    button("WebM動画を作成").click(); await until(() => !!download());
    const savedURL = download()!.href;
    await loadSample();
    assert(revoked.has(savedURL) && !download(), "Sample switch kept old export");
    pass("sample replacement revokes the old export URL and removes Download");

    const focus = document.querySelector<HTMLButtonElement>("[data-sample]")!; focus.focus();
    assert(document.activeElement === focus && getComputedStyle(focus).outlineStyle !== "none", "Sample focus invisible");
    assert([...document.querySelectorAll(".playbackButtons button, .speedOptions button")].every((b) => b.getBoundingClientRect().height >= 44), "Small tap targets");
    assert(!document.querySelector<HTMLDetailsElement>(".debugPanel")!.open, "Debug default lost");
    pass("keyboard focus, 44px playback/speed targets and closed Debug");
  } finally {
    window.fetch = originalFetch; URL.revokeObjectURL = originalURL;
    MediaRecorder.prototype.start = originalStart; Application.prototype.init = originalInit;
    window.createImageBitmap = originalDecode;
  }
  output.textContent = `${results.join("\n")}\nPASS: ${results.length} checks`;
}
run().catch((error: unknown) => { output.textContent = `${results.join("\n")}\nFAIL: ${String(error)}`; });
