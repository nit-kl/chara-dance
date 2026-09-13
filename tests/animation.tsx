import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Application } from "pixi.js";
import App from "../src/App";
import { AnimationPlayer } from "../src/animation/AnimationPlayer";
import { loadMotion, validateMotion } from "../src/animation/MotionLoader";
import { sampleTrack } from "../src/animation/interpolation";
import { assembleCharacter } from "../src/character/CharacterAssembler";
import { parseCharacterSheet } from "../src/character/CharacterSheetParser";
import { ANIMATION_PREVIEW } from "../src/config/animationPreview";
import type { MotionData } from "../src/types/motion";
import { skeletonFixture } from "./skeletonFixture";

const output = document.querySelector<HTMLPreElement>("#results")!;
const results: string[] = [];
const pause = () => new Promise((resolve) => setTimeout(resolve, 30));
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function near(value: number, expected: number) { assert(Math.abs(value - expected) < 0.00001, `${value} != ${expected}`); }
function pass(message: string) { results.push(`PASS ${message}`); output.textContent = results.join("\n"); }
async function until(predicate: () => boolean) {
  for (let i = 0; i < 300; i++) { if (predicate()) return; await pause(); }
  throw new Error("UI timeout");
}
async function rejects(work: () => unknown) {
  let rejected = false;
  try { await work(); } catch { rejected = true; }
  assert(rejected, "Invalid input was accepted");
}
function select(file: File) {
  const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
  const data = new DataTransfer(); data.items.add(file); input.files = data.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
function button(text: string) {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent === text)!;
}

async function run() {
  const sample = await loadMotion(ANIMATION_PREVIEW.motionUrl);
  assert(sample.duration === 4 && sample.loop, "Sample duration or loop");
  pass("real sample JSON loads with a four-second loop");
  const base: MotionData = { id: "test", name: "Test", duration: 2, loop: false, tracks: {
    body: [{ time: 0 }, { time: 2, rotation: 180, x: 20, y: -40, scaleX: 2, scaleY: 0.5 }],
  } };
  for (const invalid of [null, [], {}, { ...base, id: " " }, { ...base, name: 1 },
    { ...base, duration: 0 }, { ...base, duration: -1 }, { ...base, duration: Infinity },
    { ...base, loop: "true" }, { ...base, tracks: [] }, { ...base, tracks: { unknown: [] } },
    { ...base, tracks: { body: null } }, { ...base, tracks: { body: [{ time: -1 }] } },
    { ...base, tracks: { body: [{ time: NaN }] } }, { ...base, tracks: { body: [{ time: 3 }] } },
    { ...base, tracks: { body: [{ time: 1 }, { time: 0 }] } },
    { ...base, tracks: { body: [{ time: 0 }, { time: 0 }] } },
    { ...base, tracks: { body: [{ time: 0, rotation: "90" }] } },
    { ...base, tracks: { body: [{ time: 0, scaleX: Infinity }] } },
    { ...base, tracks: JSON.parse('{"__proto__": []}') },
  ]) await rejects(() => validateMotion(invalid));
  pass("20 invalid schemas, unknown bones, times, duplicates and non-finite transforms are rejected");
  const nativeFetch = window.fetch;
  try {
    window.fetch = async () => new Response("{broken", { status: 200 });
    await rejects(() => loadMotion("/invalid.json"));
    window.fetch = async () => new Response("not found", { status: 404 });
    await rejects(() => loadMotion("/missing.json"));
  } finally { window.fetch = nativeFetch; }
  pass("malformed JSON and HTTP failures reject safely");

  const file = await skeletonFixture();
  const parsed = await parseCharacterSheet(file);
  const skeleton = assembleCharacter(parsed);
  const player = new AnimationPlayer(skeleton.bones);
  const neutral = Object.values(skeleton.bones).map(({ container }) => ({ container, x: container.x, y: container.y }));
  const checkNeutral = () => {
    for (const { container, x, y } of neutral) {
      near(container.x, x); near(container.y, y); near(container.rotation, 0);
      near(container.scale.x, 1); near(container.scale.y, 1);
    }
  };
  player.setMotion(base); player.play(); player.update(1);
  const body = skeleton.bones.body.container;
  near(body.rotation, Math.PI / 2); near(body.x, 10); near(body.y, -20);
  near(body.scale.x, 1.5); near(body.scale.y, 0.75);
  pass("linear rotation/x/y/scale interpolation applies actual Pixi transforms with degrees converted to radians");
  player.pause(); player.update(1); near(player.currentTime, 1); near(body.rotation, Math.PI / 2);
  pass("pause freezes time and pose");
  player.reset(); near(player.currentTime, 0); assert(!player.isPlaying, "Reset must stop"); checkNeutral();
  pass("reset restores all ten neutral joint positions, rotations and scales");
  for (const speed of [0.5, 1, 1.5, 2]) {
    player.reset(); player.setSpeed(speed); player.play(); player.update(0.25); near(player.currentTime, 0.25 * speed);
  }
  for (const invalid of [0, -1, NaN, Infinity]) await rejects(() => player.setSpeed(invalid));
  pass("0.5/1/1.5/2 speed factors work and invalid speeds are rejected");
  player.setSpeed(1); player.reset(); player.play(); player.update(10);
  near(player.currentTime, 2); near(body.rotation, Math.PI); assert(!player.isPlaying, "Non-loop did not stop");
  player.play(); near(player.currentTime, 0);
  pass("non-loop stops at final pose and play restarts from zero");
  player.setMotion({ ...base, loop: true }); player.play(); player.update(6.5);
  near(player.currentTime, 0.5); near(body.rotation, Math.PI / 4); assert(player.isPlaying, "Loop stopped");
  player.update(1.5); near(player.currentTime, 0); near(body.rotation, 0);
  pass("loop wraps excess time and exact duration while continuing playback");
  player.setMotion({ ...base, tracks: { head: [{ time: 0, rotation: 30 }] } });
  near(player.currentTime, 0); checkNeutral(); assert(!player.isPlaying, "Switch must stop");
  player.play(); near(body.rotation, 0); near(body.scale.x, 1); near(skeleton.bones.head.container.rotation, Math.PI / 6);
  pass("motion switching clears old time, offsets, rotation and scale");
  const arm = skeleton.bones.leftUpperArm.container;
  const connection = { x: arm.x, y: arm.y };
  player.setMotion({ ...base, tracks: { leftUpperArm: [{ time: 0, x: 12, y: -8 }] } }); player.play();
  near(arm.x, connection.x + 12); near(arm.y, connection.y - 8);
  assert(skeleton.bones.leftLowerArm.container.parent === arm, "Hierarchy changed");
  pass("motion offsets preserve non-zero attachment positions and child hierarchy");
  const delayed = sampleTrack([{ time: 1, x: 10, scaleX: 2 }, { time: 2, rotation: 90 }], 0.5);
  near(delayed.x, 5); near(delayed.scaleX, 1.5);
  const sparse = sampleTrack([{ time: 1, x: 10, scaleX: 2 }, { time: 2, rotation: 90 }], 1.5);
  near(sparse.x, 5); near(sparse.scaleX, 1.5); near(sparse.rotation, 45);
  near(sampleTrack([{ time: 1, x: 10 }], 2).x, 10);
  near(sampleTrack([], 1).scaleY, 1);
  near(sampleTrack(undefined, 1).rotation, 0);
  pass("sparse/default/empty tracks and pre-first/post-last boundaries follow neutral semantics");
  const mutable = structuredClone(base); player.setMotion(mutable); mutable.tracks.body![1].rotation = 0;
  player.play(); player.update(1); near(body.rotation, Math.PI / 2);
  player.destroy(); checkNeutral(); player.update(1); near(player.currentTime, 0); near(player.duration, 0);
  skeleton.destroy();
  pass("player owns motion data and releases targets and motion on destruction");

  const originalInit = Application.prototype.init;
  const apps: Application[] = [];
  Application.prototype.init = async function (...args) { apps.push(this); return originalInit.apply(this, args); };
  const root = createRoot(document.querySelector("#test-app")!);
  try {
    root.render(<StrictMode><App /></StrictMode>);
    await until(() => !!document.querySelector("input")); select(file);
    await until(() => !!button("Play") && !button("Play").disabled);
    const oldApp = apps.at(-1)!;
    const oldStage = oldApp.stage;
    const oldBody = oldStage.getChildByLabel("body", true)!;
    const ticker = oldApp.ticker;
    button("Play").click();
    await until(() => Math.abs(oldBody.rotation) > 0.005 && parseFloat(document.querySelector("output")!.textContent!) > 0.1);
    assert(ticker.started, "Ticker not started");
    await until(() => parseFloat(document.querySelector("output")!.textContent!) > 3.5);
    await until(() => parseFloat(document.querySelector("output")!.textContent!) < 0.5);
    assert(ticker.started, "Sample stopped at its duration");
    pass("sample runs through four real seconds and loops on the Pixi Ticker");
    button("Pause").click();
    const frozen = oldBody.rotation; await pause(); await pause(); near(oldBody.rotation, frozen);
    assert(!ticker.started, "Paused ticker still running");
    button("Reset").click(); near(oldBody.rotation, 0); near(oldBody.x, 0);
    await until(() => parseFloat(document.querySelector("output")!.textContent!) === 0);
    assert(parseFloat(document.querySelector("output")!.textContent!) === 0, "UI reset time");
    pass("real Ticker drives canvas bones and Play/Pause/Reset controls work");
    document.querySelector<HTMLButtonElement>('[data-speed="2"]')!.click();
    button("Play").click();
    await until(() => ticker.started);
    select(await skeletonFixture("#ffad70"));
    await until(() => oldStage.destroyed && !!button("Play") && !button("Play").disabled);
    assert(!ticker.started && ticker.count === 0, "Old ticker/listeners leaked");
    assert(parseFloat(document.querySelector("output")!.textContent!) === 0, "Re-upload time not reset");
    assert(document.querySelectorAll(".partImage canvas").length === 10 && document.querySelectorAll(".characterCanvas canvas").length === 1, "Previews lost");
    pass("re-upload stops and removes old Ticker listeners, destroys skeleton and resets new playback");
    const currentTicker = apps.at(-1)!.ticker;
    button("Play").click();
    root.unmount();
    await pause();
    assert(!currentTicker.started && currentTicker.count === 0, "Unmount ticker leak");
    pass("unmount stops playback and removes all ticker callbacks");
  } finally {
    Application.prototype.init = originalInit;
  }

  // Exercise the user-facing invalid-motion error, then recover via re-upload.
  const errorRoot = createRoot(document.querySelector("#test-app")!);
  try {
    window.fetch = async (...args) => String(args[0]) === ANIMATION_PREVIEW.motionUrl
      ? new Response('{"duration":-1}', { status: 200 }) : nativeFetch(...args);
    errorRoot.render(<App />); await until(() => !!document.querySelector("input")); select(file);
    await until(() => !!document.querySelector(".characterPreview")?.textContent?.includes("ダンスを読み込めません"));
    assert(button("Play").disabled && !!document.querySelector(".characterCanvas canvas"), "Invalid motion crashed preview");
    window.fetch = nativeFetch;
    select(file); await until(() => !!button("Play") && !button("Play").disabled);
    pass("invalid motion shows an error without losing previews and re-upload recovers");

    let resolveOld!: (response: Response) => void;
    let oldSignal: AbortSignal | null | undefined;
    let requests = 0;
    window.fetch = async (...args) => {
      if (String(args[0]) === ANIMATION_PREVIEW.motionUrl && ++requests === 1) {
        oldSignal = args[1]?.signal;
        return new Promise<Response>((resolve) => { resolveOld = resolve; });
      }
      return nativeFetch(...args);
    };
    select(file);
    await until(() => requests === 1);
    const oldCanvas = document.querySelector(".characterCanvas canvas")!;
    select(new File([file], "new-character.png", { type: "image/png" }));
    await until(() => !oldCanvas.isConnected && !!button("Play") && !button("Play").disabled);
    assert(oldSignal?.aborted, "Old motion request was not aborted");
    resolveOld(new Response(JSON.stringify({ ...sample, name: "Stale motion", duration: 99 })));
    await pause(); await pause();
    assert(!document.querySelector(".characterPreview")!.textContent!.includes("Stale motion")
      && document.querySelector("output")!.textContent!.includes("4.00"), "Stale motion replaced current state");
    pass("re-upload aborts in-flight motion loading and ignores delayed stale responses");
  } finally { window.fetch = nativeFetch; }
  button("Play").click(); // Leave the real sample running for visual inspection.
  output.textContent = `${results.join("\n")}\nPASS: ${results.length} checks`;
}

run().catch((error: unknown) => {
  output.textContent = `${results.join("\n")}\nFAIL: ${String(error)}`;
});
