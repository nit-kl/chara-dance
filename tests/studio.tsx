import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Application } from "pixi.js";
import type { WebGLRenderer } from "pixi.js";
import App from "../src/App";
import { BACKGROUNDS } from "../src/config/backgrounds";
import { MOTIONS } from "../src/config/motions";
import { skeletonFixture } from "./skeletonFixture";

const results: string[] = [];
const output = document.querySelector<HTMLPreElement>("#results")!;
const pause = () => new Promise((resolve) => setTimeout(resolve, 20));
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function pass(message: string) { results.push(`PASS ${message}`); output.textContent = results.join("\n"); }
async function until(predicate: () => boolean) {
  for (let i = 0; i < 400; i++) { if (predicate()) return; await pause(); }
  throw new Error("Studio timeout");
}
function button(text: string) { return [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent === text)!; }
function select(file: File) {
  const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
  const data = new DataTransfer(); data.items.add(file); input.files = data.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
function dance(id: string) {
  const select = document.querySelector<HTMLSelectElement>("#dance-select")!;
  select.value = id; select.dispatchEvent(new Event("change", { bubbles: true }));
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}

async function run() {
  const originalInit = Application.prototype.init;
  const originalDecode = window.createImageBitmap;
  const originalFetch = window.fetch;
  const apps: Application[] = [];
  const rendererGate = gate();
  let holdRenderer = true;
  Application.prototype.init = async function (...args) {
    apps.push(this);
    if (holdRenderer) await rendererGate.promise;
    return originalInit.apply(this, args);
  };
  const root = createRoot(document.querySelector("#test-app")!);
  try {
    root.render(<StrictMode><App /></StrictMode>);
    await until(() => !!document.querySelector("input"));
    assert(document.querySelector(".emptyState") && !document.querySelector(".characterCanvas canvas"), "Missing empty state");
    assert(button("Play").disabled && button("Pause").disabled && button("Reset").disabled, "Empty playback enabled");
    assert(document.querySelector('label[for="character-file"]') && document.querySelector('label[for="dance-select"]'), "Input labels missing");
    pass("empty state, upload action, disabled playback and input labels");

    const file = await skeletonFixture();
    const validationGate = gate();
    const parserGate = gate();
    let decodes = 0;
    window.createImageBitmap = (async (image: ImageBitmapSource) => {
      if (++decodes === 1) await validationGate.promise;
      else if (decodes === 2) await parserGate.promise;
      return originalDecode(image);
    }) as typeof createImageBitmap;
    select(file);
    await until(() => decodes === 1);
    assert(document.querySelector(".stageNotice")?.textContent?.includes("画像を確認"), "Validation loading missing");
    validationGate.release(); await until(() => decodes === 2);
    assert(document.querySelector(".stageNotice")?.textContent?.includes("キャラクターを準備"), "Parser loading missing");
    parserGate.release(); await until(() => apps.length > 0 && !!document.querySelector(".stageNotice")?.textContent?.includes("組み立て"));
    assert(document.querySelector(".stageNotice")?.textContent?.includes("組み立て"), "Skeleton loading missing");
    dance(MOTIONS[1].id); // Settings remain safe even before Application.init finishes.
    document.querySelector<HTMLButtonElement>('[data-speed="1.5"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-background="light"]')!.click();
    holdRenderer = false; rendererGate.release();
    await until(() => !button("Play").disabled);
    window.createImageBitmap = originalDecode;
    const app = apps.at(-1)!;
    const canvas = app.canvas;
    assert(document.querySelectorAll(".characterCanvas canvas").length === 1 && !document.querySelector(".emptyState"), "Preview not shown");
    assert(document.querySelector<HTMLSelectElement>("#dance-select")!.value === MOTIONS[1].id, "Loading selection lost");
    assert(document.querySelector('[data-speed="1.5"]')!.getAttribute("aria-pressed") === "true", "Loading speed lost");
    assert(app.renderer.background.alpha === 1, "Background not set");
    pass("validation/parser/skeleton loading and settings changed during initialization");

    const debug = document.querySelector<HTMLDetailsElement>("details.debugPanel")!;
    assert(!debug.open && document.querySelectorAll(".partImage canvas").length === 10, "Debug default or parts missing");
    debug.querySelector<HTMLElement>("summary")!.click(); await until(() => debug.open);
    assert(document.querySelector(".partCard")!.getBoundingClientRect().height > 0, "Debug did not open");
    debug.querySelector<HTMLElement>("summary")!.click(); await until(() => !debug.open);
    pass("Debug is collapsed by default and opens/closes with all ten parts intact");

    for (const option of BACKGROUNDS) {
      document.querySelector<HTMLButtonElement>(`[data-background="${option.id}"]`)!.click();
      await until(() => document.querySelector(`[data-background="${option.id}"]`)!.getAttribute("aria-pressed") === "true");
      app.render();
      const gl = (app.renderer as WebGLRenderer).gl;
      const pixel = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      assert(pixel[3] === option.alpha * 255, `Actual canvas alpha ${option.id}`);
      if (option.alpha) assert(pixel[0] === ((option.color >> 16) & 255) && pixel[1] === ((option.color >> 8) & 255) && pixel[2] === (option.color & 255), `Actual background color ${option.id}`);
      assert(app.canvas === canvas, "Background recreated renderer");
      assert(document.querySelector(".characterCanvas")!.classList.contains("checker") === option.checker, "Checker mismatch");
    }
    pass("Dark/Light/Transparent Checker update actual GPU background pixels without recreating the canvas");

    for (const speed of [0.5, 1, 1.5, 2]) {
      document.querySelector<HTMLButtonElement>(`[data-speed="${speed}"]`)!.click();
      await until(() => document.querySelector(`[data-speed="${speed}"]`)!.getAttribute("aria-pressed") === "true");
      assert(document.querySelectorAll('.speedOptions [aria-pressed="true"]').length === 1, "Ambiguous speed selection");
    }
    button("Play").click(); await until(() => parseFloat(document.querySelector("output")!.textContent!) > 0.1);
    assert(button("Play").disabled && !button("Pause").disabled, "Playback disabled states");
    button("Pause").click();
    const paused = app.stage.getChildByLabel("body", true)!.rotation;
    await pause(); await pause();
    assert(app.stage.getChildByLabel("body", true)!.rotation === paused && !app.ticker.started, "Pause failed");
    button("Reset").click(); await until(() => document.querySelector("output")!.textContent!.startsWith("00.00"));
    pass("Play/Pause/Reset, formatted time and all speed selections");

    button("Play").click(); await until(() => app.ticker.started);
    dance(MOTIONS[0].id); await until(() => !button("Play").disabled);
    assert(!app.ticker.started && app.stage.getChildByLabel("body", true)!.rotation === 0, "Motion switch failed to stop/reset");
    assert(app.canvas === canvas, "Motion switch recreated renderer");
    pass("Config-driven motion selection resets playback on the existing renderer");

    const motionGate = gate();
    let motionRequested = false;
    window.fetch = async (...args) => {
      if (String(args[0]) === MOTIONS[1].path) { motionRequested = true; await motionGate.promise; }
      return originalFetch(...args);
    };
    dance(MOTIONS[1].id); await until(() => motionRequested);
    assert(button("Play").disabled && document.querySelector(".stageNotice")?.textContent?.includes("ダンスを読み込んで"), "Motion loading missing");
    motionGate.release(); await until(() => !button("Play").disabled);
    window.fetch = async (...args) => String(args[0]) === MOTIONS[0].path ? new Response("broken", { status: 500 }) : originalFetch(...args);
    dance(MOTIONS[0].id); await until(() => !!document.querySelector(".previewError"));
    assert(button("Play").disabled && !!document.querySelector(".characterCanvas canvas"), "Motion error state");
    window.fetch = originalFetch;
    button("再試行").click(); await until(() => !button("Play").disabled && !document.querySelector(".previewError"));
    pass("motion loading/error states and retry recover without re-upload");

    const oldStage = app.stage;
    select(await skeletonFixture("#ffad70"));
    await until(() => oldStage.destroyed && !button("Play").disabled);
    assert(document.querySelector(".characterCanvas canvas") !== canvas && !apps.at(-1)!.ticker.started, "Re-upload did not replace/reset");
    assert(document.querySelector('[data-background="transparent"]')!.getAttribute("aria-pressed") === "true", "Background preference lost");
    assert(document.querySelector('[data-speed="2"]')!.getAttribute("aria-pressed") === "true", "Speed preference lost");
    pass("re-upload replaces renderer and preserves user speed/background preferences");

    select(new File(["invalid"], "invalid.png", { type: "image/png" }));
    await until(() => !!document.querySelector(".message.error"));
    assert(document.querySelector(".previewError") && !document.querySelector(".characterCanvas canvas"), "PNG error not clear");
    const tiny = document.createElement("canvas"); tiny.width = 1; tiny.height = 1;
    const tinyBlob = await new Promise<Blob>((resolve) => tiny.toBlob((blob) => resolve(blob!)));
    select(new File([tinyBlob], "tiny.png", { type: "image/png" }));
    await until(() => !!document.querySelector(".previewError")?.textContent?.includes("現在: 1×1"));
    let parseDecodes = 0;
    window.createImageBitmap = (async (image: ImageBitmapSource) => {
      if (++parseDecodes === 2) throw new Error("Test parser failure");
      return originalDecode(image);
    }) as typeof createImageBitmap;
    select(file); await until(() => !!document.querySelector(".previewError")?.textContent?.includes("この画像は読み込めません"));
    window.createImageBitmap = originalDecode;
    pass("invalid PNG, dimensions and parser errors show actionable messages without a stack trace");

    const trackedInit = Application.prototype.init;
    Application.prototype.init = async () => { throw new Error("Test WebGL failure"); };
    select(file); await until(() => !!document.querySelector(".previewError")?.textContent?.includes("キャラクターを表示できません"));
    assert(!document.querySelector(".previewError")!.textContent!.includes("Test WebGL"), "Technical error exposed");
    Application.prototype.init = trackedInit;
    select(file); await until(() => !button("Play").disabled);
    pass("renderer errors preserve Debug and recover through re-upload");

    const focusTarget = document.querySelector<HTMLSelectElement>("#dance-select")!;
    focusTarget.focus();
    assert(document.activeElement === focusTarget && getComputedStyle(focusTarget).outlineStyle !== "none", "Visible focus missing");
    assert([...document.querySelectorAll<HTMLButtonElement>("button")].every((item) => !!item.textContent?.trim() || !!item.getAttribute("aria-label")), "Unnamed button");
    pass("visible keyboard focus and named native controls");
  } finally {
    window.fetch = originalFetch;
    window.createImageBitmap = originalDecode;
    Application.prototype.init = originalInit;
  }
  document.querySelector<HTMLButtonElement>('[data-background="dark"]')!.click();
  document.querySelector<HTMLButtonElement>('[data-speed="1"]')!.click();
  output.textContent = `${results.join("\n")}\nPASS: ${results.length} checks`;
  // Keep the studio mounted for responsive screenshots and native keyboard checks.
}

run().catch((error: unknown) => { output.textContent = `${results.join("\n")}\nFAIL: ${String(error)}`; });
