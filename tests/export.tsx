import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Application } from "pixi.js";
import App from "../src/App";
import { VideoExporter, canExportWebM, selectWebMMimeType } from "../src/export/VideoExporter";
import { EXPORT_CONFIG } from "../src/config/export";
import { RecordingSession } from "../src/export/RecordingSession";
import type { CharacterRenderer } from "../src/character/CharacterRenderer";
import { skeletonFixture } from "./skeletonFixture";

const results: string[] = [];
const output = document.querySelector<HTMLPreElement>("#results")!;
const pause = () => new Promise((resolve) => setTimeout(resolve, 20));
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function pass(message: string) { results.push(`PASS ${message}`); output.textContent = results.join("\n"); }
async function until(predicate: () => boolean, attempts = 500) {
  for (let i = 0; i < attempts; i++) { if (predicate()) return; await pause(); }
  throw new Error("Export timeout");
}
async function rejects(work: () => Promise<unknown>) { let rejected = false; try { await work(); } catch { rejected = true; } assert(rejected, "Failure was accepted"); }
function button(text: string) { return [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent === text)!; }
function select(file: File) { const input = document.querySelector<HTMLInputElement>("input[type=file]")!; const data = new DataTransfer(); data.items.add(file); input.files = data.files; input.dispatchEvent(new Event("change", { bubbles: true })); }
const download = () => document.querySelector<HTMLAnchorElement>(".downloadButton");

async function run() {
  const NativeRecorder = window.MediaRecorder;
  const nativeCapture = HTMLCanvasElement.prototype.captureStream;
  const nativeCreateURL = URL.createObjectURL;
  const nativeRevokeURL = URL.revokeObjectURL;
  const revoked = new Set<string>();
  URL.revokeObjectURL = (url: string) => { revoked.add(url); nativeRevokeURL(url); };
  let mode = "normal";
  let preferred = "video/webm;codecs=vp8";
  let fakeTrackStopped = false;
  const fakeInstances: FakeRecorder[] = [];
  class FakeRecorder {
    static isTypeSupported(type: string) { return type === preferred; }
    state = "inactive";
    mimeType: string;
    onstart: (() => void) | null = null;
    onstop: (() => void) | null = null;
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(_stream: MediaStream, options: MediaRecorderOptions) {
      if (mode === "constructor") throw new Error("constructor failed");
      this.mimeType = options.mimeType!; fakeInstances.push(this);
    }
    start() {
      if (mode === "start") throw new Error("start failed");
      this.state = "recording";
      queueMicrotask(() => { this.onstart?.(); if (mode === "error") this.onerror?.(); });
    }
    stop() {
      if (mode === "stop") throw new Error("stop failed");
      this.state = "inactive";
      if (mode === "timeout") return;
      queueMicrotask(() => {
        this.ondataavailable?.(new BlobEvent("dataavailable", { data: new Blob(mode === "empty" ? [] : ["webm-test"], { type: this.mimeType }) }));
        this.onstop?.();
      });
    }
  }
  try {
    window.MediaRecorder = FakeRecorder as unknown as typeof MediaRecorder;
    const canvas = document.createElement("canvas");
    canvas.captureStream = (fps?: number) => {
      assert(fps === EXPORT_CONFIG.fps, "Wrong FPS"); fakeTrackStopped = false;
      return { getTracks: () => [{ stop: () => { fakeTrackStopped = true; } }] } as unknown as MediaStream;
    };
    assert(selectWebMMimeType() === preferred && canExportWebM(canvas), "MIME fallback");
    preferred = "video/webm"; assert(selectWebMMimeType() === preferred, "Generic WebM fallback");
    preferred = "video/mp4"; assert(!canExportWebM(canvas), "Unsupported WebM accepted");
    preferred = EXPORT_CONFIG.mimeTypes[0];
    const saved = canvas.captureStream;
    Object.defineProperty(canvas, "captureStream", { value: undefined, configurable: true });
    assert(!canExportWebM(canvas), "Missing captureStream accepted");
    Object.defineProperty(canvas, "captureStream", { value: saved, writable: true });
    window.MediaRecorder = undefined as unknown as typeof MediaRecorder;
    assert(!canExportWebM(canvas), "Missing MediaRecorder accepted");
    window.MediaRecorder = FakeRecorder as unknown as typeof MediaRecorder;
    pass("captureStream/MediaRecorder support and VP9/VP8/WebM MIME selection");

    const exporter = new VideoExporter();
    const first = exporter.start(canvas, () => exporter.stop());
    const result = await first;
    assert(result && result.blob.size > 0 && result.url.startsWith("blob:") && fakeTrackStopped, "Blob/URL/track result");
    const oldURL = result.url;
    const next = exporter.start(canvas, () => exporter.stop());
    assert(revoked.has(oldURL), "Re-export did not revoke previous URL");
    await next; exporter.cancel();
    pass("non-empty Blob, URL generation, re-export revocation and track cleanup");
    for (const failure of ["constructor", "start", "stop", "empty", "error"]) {
      mode = failure;
      await rejects(() => exporter.start(canvas, () => { if (mode !== "error") exporter.stop(); }));
      assert(fakeTrackStopped, `${failure} did not release tracks`);
      assert(fakeInstances.every((item) => !item.onstart && !item.onstop && !item.onerror && !item.ondataavailable), "Event handlers retained");
    }
    mode = "normal";
    const cancelled = exporter.start(canvas, () => {}); exporter.cancel();
    assert(await cancelled === null && fakeTrackStopped, "Cancel result");
    pass("constructor/start/stop/error/empty-data failures and cancel release handlers/tracks");
    const timeout = EXPORT_CONFIG.stopTimeoutMs;
    EXPORT_CONFIG.stopTimeoutMs = 30;
    try {
      mode = "timeout";
      await rejects(() => exporter.start(canvas, () => exporter.stop()));
      assert(fakeTrackStopped, "Stop timeout kept track");
    } finally { EXPORT_CONFIG.stopTimeoutMs = timeout; mode = "normal"; }
    let canvasError = "";
    const session = new RecordingSession((state) => { canvasError = state.error ?? ""; });
    await session.start({ getCanvas: () => null } as unknown as CharacterRenderer,
      { id: "dark", name: "Dark", color: 0, alpha: 1, checker: false }, "test");
    assert(canvasError.includes("キャラクターを録画できません"), "Missing canvas error");
    pass("stop-event timeout releases capture and missing renderer canvas reports an error");
  } finally { window.MediaRecorder = NativeRecorder; }

  assert(canExportWebM(document.createElement("canvas")), "Real browser must support WebM for integration checks");
  const captured: { canvas: HTMLCanvasElement; stream: MediaStream; fps: number | undefined }[] = [];
  HTMLCanvasElement.prototype.captureStream = function (fps) {
    const stream = nativeCapture.call(this, fps); captured.push({ canvas: this, stream, fps }); return stream;
  };
  const nativeInit = Application.prototype.init;
  const apps: Application[] = [];
  Application.prototype.init = async function (...args) { apps.push(this); return nativeInit.apply(this, args); };
  const root = createRoot(document.querySelector("#test-app")!);
  const file = await skeletonFixture();
  try {
    root.render(<StrictMode><App /></StrictMode>);
    await until(() => !!document.querySelector("input")); select(file);
    await until(() => !!button("WebM動画を作成") && !button("WebM動画を作成").disabled);
    const app = apps.at(-1)!;
    document.querySelector<HTMLButtonElement>('[data-speed="2"]')!.click();
    button("Play").click(); await until(() => parseFloat(document.querySelector("output")!.textContent!) > 0.4);
    button("WebM動画を作成").click();
    await until(() => !!button("キャンセル"));
    assert(captured.at(-1)!.canvas === document.querySelector(".characterCanvas canvas") && captured.at(-1)!.fps === 30, "Not the real preview canvas");
    const time = parseFloat(document.querySelector("output")!.textContent!);
    assert(time < 0.2, "Export did not reset to zero");
    assert([...document.querySelectorAll<HTMLElement>('.playbackButtons button, .speedOptions button, .backgroundOptions button, #dance-select, .uploadCard button, input[type=file]')].every((item) => item.matches(":disabled")), "UI not locked");
    const started = performance.now();
    await until(() => parseFloat(document.querySelector("output")!.textContent!) > 0.5);
    assert(performance.now() - started > 300, "Export appears to use selected 2x speed");
    button("キャンセル").click(); await until(() => !!button("WebM動画を作成") && !button("WebM動画を作成").disabled);
    assert(!download() && !app.ticker.started && app.stage.getChildByLabel("body", true)!.rotation === 0, "Cancel not neutral");
    assert(captured.every((item) => item.stream.getTracks().every((track) => track.readyState === "ended")), "Cancel tracks live");
    pass("real preview capture at 30fps, reset from playing, 1x speed, UI lock and Cancel");

    button("WebM動画を作成").click();
    const recordingStart = performance.now();
    await until(() => !!download());
    const elapsed = (performance.now() - recordingStart) / 1000;
    assert(elapsed > 3.8 && elapsed < 6, `Unexpected recording time ${elapsed}`);
    const firstURL = download()!.href;
    const firstBlob = await (await fetch(firstURL)).blob();
    const artifact = document.createElement("a"); artifact.id = "export-artifact";
    artifact.href = nativeCreateURL(firstBlob); artifact.download = "verified-dance.webm";
    artifact.textContent = "Verified WebM test artifact"; document.body.appendChild(artifact);
    window.addEventListener("pagehide", () => nativeRevokeURL(artifact.href), { once: true });
    assert(firstBlob.size > 1000 && firstBlob.type.startsWith("video/webm"), "Real WebM empty");
    assert(/^[a-z0-9-]+\.webm$/.test(download()!.download), "Unsafe filename");
    assert(captured.every((item) => item.stream.getTracks().every((track) => track.readyState === "ended")), "Complete tracks live");
    assert(document.querySelector('[data-speed="2"]')!.getAttribute("aria-pressed") === "true", "User speed not restored");
    pass("one four-second loop produces non-empty WebM, a safe download and restores speed");

    const video = document.createElement("video"); video.id = "recorded-video"; video.muted = true; video.controls = true;
    document.body.appendChild(video); video.src = firstURL;
    await video.play();
    await until(() => video.currentTime > 0.15);
    const probe = document.createElement("canvas"); probe.width = video.videoWidth; probe.height = video.videoHeight;
    const context = probe.getContext("2d")!;
    context.drawImage(video, 0, 0); const a = context.getImageData(0, 0, probe.width, probe.height).data;
    await until(() => video.currentTime > 0.65);
    context.drawImage(video, 0, 0); const b = context.getImageData(0, 0, probe.width, probe.height).data;
    let changed = 0; let blue = 0;
    for (let i = 0; i < a.length; i += 4) { if (Math.abs(a[i] - b[i]) > 25) changed++; if (b[i + 2] > 170 && b[i + 1] > 100) blue++; }
    assert(changed > 100 && blue > 100, "Recorded video lacks moving character pixels");
    const frame = document.createElement("img"); frame.id = "export-frame"; frame.src = probe.toDataURL("image/png");
    frame.alt = "Decoded WebM frame"; document.body.appendChild(frame);
    await until(() => video.ended);
    assert(video.currentTime > 3.8 && video.currentTime < 4.5, `Video duration ${video.currentTime}`);
    pass(`generated WebM decodes and plays moving character frames (${video.currentTime.toFixed(2)} sec)`);

    button("もう一度作る").click(); await until(() => !!button("キャンセル"));
    assert(revoked.has(firstURL) && !download(), "Create Again retained old URL");
    button("キャンセル").click(); await until(() => !!button("WebM動画を作成") && !button("WebM動画を作成").disabled);
    document.querySelector<HTMLButtonElement>('[data-background="transparent"]')!.click();
    await until(() => document.querySelector('[data-background="transparent"]')!.getAttribute("aria-pressed") === "true");
    button("WebM動画を作成").click(); await until(() => !!download());
    const checkerURL = download()!.href;
    video.src = checkerURL; await video.play(); await until(() => video.currentTime > 0.1);
    context.drawImage(video, 0, 0);
    const cornerA = context.getImageData(3, 3, 1, 1).data;
    const cornerB = context.getImageData(15, 3, 1, 1).data;
    assert(Math.abs(cornerA[0] - cornerB[0]) > 15 && cornerA[3] === 255 && cornerB[3] === 255, `Checker not baked into video: ${Array.from(cornerA)} / ${Array.from(cornerB)}`);
    video.pause();
    assert(app.renderer.background.alpha === 0, "Transparent preview not restored");
    pass("Transparent Checker is baked into opaque video and transparent preview is restored");

    const dance = document.querySelector<HTMLSelectElement>("#dance-select")!;
    dance.value = "gentle-sway"; dance.dispatchEvent(new Event("change", { bubbles: true }));
    await until(() => revoked.has(checkerURL) && !!button("WebM動画を作成") && !button("WebM動画を作成").disabled);
    assert(!download(), "Dance change kept old download");
    document.querySelector<HTMLButtonElement>('[data-background="light"]')!.click();
    await until(() => document.querySelector('[data-background="light"]')!.getAttribute("aria-pressed") === "true");
    button("WebM動画を作成").click(); await until(() => !!download());
    const changedURL = download()!.href;
    video.src = changedURL; await video.play(); await until(() => video.currentTime > 0.1);
    context.drawImage(video, 0, 0);
    const light = context.getImageData(3, 3, 1, 1).data;
    assert(light[0] > 230 && light[1] > 230 && light[2] > 230 && light[3] === 255, "Light background absent from WebM");
    video.pause();
    pass("Light background is included in the recorded WebM");
    select(file); await until(() => revoked.has(changedURL) && !!button("WebM動画を作成") && !button("WebM動画を作成").disabled);
    assert(!download(), "Character change kept old download");
    pass("Dance and character changes revoke URLs and remove previous exports");

    button("WebM動画を作成").click(); await until(() => !!button("キャンセル"));
    root.unmount();
    await until(() => captured.every((item) => item.stream.getTracks().every((track) => track.readyState === "ended")));
    pass("unmount cancels active recording and releases all real capture tracks");
    video.remove();
  } finally {
    HTMLCanvasElement.prototype.captureStream = nativeCapture;
    Application.prototype.init = nativeInit;
    URL.createObjectURL = nativeCreateURL;
    URL.revokeObjectURL = nativeRevokeURL;
  }

  const unsupportedRoot = createRoot(document.querySelector("#test-app")!);
  try {
    window.MediaRecorder = undefined as unknown as typeof MediaRecorder;
    unsupportedRoot.render(<App />);
    await until(() => !!document.querySelector(".exportControls"));
    assert(document.querySelector(".exportControls")!.textContent!.includes("このブラウザでは動画出力に対応していません"), "Unsupported message missing");
    assert(button("WebM動画を作成").disabled, "Unsupported button enabled");
    pass("unsupported browsers display a user message and disabled Export");
  } finally { unsupportedRoot.unmount(); window.MediaRecorder = NativeRecorder; }
  output.textContent = `${results.join("\n")}\nPASS: ${results.length} checks`;
}
run().catch((error: unknown) => { output.textContent = `${results.join("\n")}\nFAIL: ${String(error)}`; });
