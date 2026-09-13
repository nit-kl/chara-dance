import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Application, Rectangle, Sprite } from "pixi.js";
import type { Container, Texture, TextureSource } from "pixi.js";
import App from "../src/App";
import { assembleCharacter } from "../src/character/CharacterAssembler";
import { CharacterRenderer } from "../src/character/CharacterRenderer";
import { parseCharacterSheet } from "../src/character/CharacterSheetParser";
import { CHARACTER_SHEET_V1 as spec } from "../src/config/characterSheetV1";
import { SKELETON_DRAW_ORDER, SKELETON_V1 } from "../src/config/skeletonV1";
import { CHARACTER_PREVIEW } from "../src/config/characterPreview";
import type { BoneName } from "../src/types/character";
import { skeletonFixture } from "./skeletonFixture";

const output = document.querySelector<HTMLPreElement>("#results")!;
const messages: string[] = [];
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const pause = () => new Promise((resolve) => setTimeout(resolve, 30));
async function until(predicate: () => boolean) {
  for (let i = 0; i < 400; i++) {
    if (predicate()) return;
    await pause();
  }
  throw new Error("Timeout");
}
function pass(message: string) {
  messages.push(`PASS ${message}`);
  output.textContent = messages.join("\n");
}
function select(file: File) {
  const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
  const data = new DataTransfer();
  data.items.add(file);
  input.files = data.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
function owned(root: Container) {
  const textures: Texture[] = [];
  const sources: TextureSource[] = [];
  const visit = (node: Container) => {
    if (node instanceof Sprite) { textures.push(node.texture); sources.push(node.texture.source); }
    node.children.forEach(visit);
  };
  visit(root);
  return { textures, sources };
}
function released(resources: ReturnType<typeof owned>) {
  return resources.textures.every((texture) => texture.destroyed)
    && resources.sources.every((source) => source.destroyed && !source.resource);
}

async function run() {
  const file = await skeletonFixture();
  const parsed = await parseCharacterSheet(file);
  const skeleton = assembleCharacter(parsed);
  const expectedParents: Record<BoneName, BoneName | "root"> = {
    body: "root", head: "body", leftUpperArm: "body", rightUpperArm: "body",
    leftUpperLeg: "body", rightUpperLeg: "body", leftLowerArm: "leftUpperArm",
    rightLowerArm: "rightUpperArm", leftLowerLeg: "leftUpperLeg", rightLowerLeg: "rightUpperLeg",
  };
  assert(Object.keys(skeleton.bones).length === 10, "Bone count");
  for (const bone of Object.values(skeleton.bones)) {
    assert(bone.sprite.texture.source.resource === parsed.parts[bone.name].canvas, "Texture must use original canvas");
    assert(bone.container.parent?.label === expectedParents[bone.name], `Parent of ${bone.name}`);
    assert(bone.sprite.parent === bone.container, "Sprite transform parent");
    assert(bone.container.rotation === 0 && bone.container.scale.x === 1 && bone.container.scale.y === 1, "Neutral transform");
    assert(bone.sprite.anchor.x === spec.parts[bone.name].pivot.x && bone.sprite.anchor.y === spec.parts[bone.name].pivot.y, "Configured pivot");
    const attachment = SKELETON_V1[bone.name];
    if (attachment.parent !== "root") {
      const parent = spec.parts[attachment.parent];
      assert(bone.container.x === (attachment.x - parent.pivot.x) * parent.width, "Attachment x");
      assert(bone.container.y === (attachment.y - parent.pivot.y) * parent.height, "Attachment y");
      assert(skeleton.bones[attachment.parent].children.includes(bone), "Bone children list");
    }
  }
  pass("10 owned canvas textures, 10 bones, hierarchy, pivots, attachments and neutral transforms");
  const arm = skeleton.bones.leftUpperArm.container;
  const elbow = skeleton.bones.leftLowerArm.container;
  const before = elbow.getGlobalPosition();
  arm.rotation = Math.PI / 2;
  const after = elbow.getGlobalPosition();
  assert(Math.abs(before.x - after.x) > 1, "Child must inherit rotation");
  arm.rotation = 0;
  pass("child joint inherits parent rotation");
  assert(skeleton.layer.renderLayerChildren.every((sprite, i) => sprite === skeleton.bones[SKELETON_DRAW_ORDER[i]].sprite), "Global draw order");
  const resources = owned(skeleton.root);
  const independent = assembleCharacter(parsed);
  assert(independent.bones.head.sprite.texture.source !== skeleton.bones.head.sprite.texture.source, "Shared cached source");
  skeleton.destroy(); skeleton.destroy();
  assert(released(resources) && skeleton.root.destroyed && skeleton.layer.destroyed, "Assembly cleanup");
  assert(parsed.parts.head.canvas.width === spec.parts.head.width && !independent.bones.head.sprite.texture.destroyed, "Cleanup damaged shared canvas or new character");
  independent.destroy();
  pass("idempotent destruction releases textures/sources/containers without damaging canvases");

  const originalInit = Application.prototype.init;
  const originalDestroy = Application.prototype.destroy;
  const apps: Application[] = [];
  const destroyedApps = new Set<Application>();
  Application.prototype.init = async function (...args) {
    apps.push(this);
    return originalInit.apply(this, args);
  };
  Application.prototype.destroy = function (...args) {
    destroyedApps.add(this);
    return originalDestroy.apply(this, args);
  };
  const NativeObserver = window.ResizeObserver;
  const observers = new Set<ResizeObserver>();
  window.ResizeObserver = class extends NativeObserver {
    observe(...args: Parameters<ResizeObserver["observe"]>) { observers.add(this); super.observe(...args); }
    disconnect() { observers.delete(this); super.disconnect(); }
  };
  const host = document.createElement("div");
  host.style.cssText = "width:920px;max-width:100%;height:500px";
  document.body.appendChild(host);
  try {
    const renderer = new CharacterRenderer(host, parsed);
    await renderer.ready;
    const app = apps.at(-1)!;
    assert(!app.ticker.started && host.querySelectorAll("canvas").length === 1, "Static canvas");
    const canvas = app.canvas;
    const root = app.stage.children[0];
    const liveResources = owned(root);
    for (const width of [920, 768, 320]) {
      host.style.width = `${width}px`;
      await until(() => app.screen.width === host.clientWidth);
      const bounds = root.getBounds();
      assert(bounds.width <= app.screen.width * CHARACTER_PREVIEW.maxWidthRatio + 0.01, "Width fit");
      assert(bounds.height <= app.screen.height * CHARACTER_PREVIEW.maxHeightRatio + 0.01, "Height fit");
      assert(bounds.x >= 0 && bounds.y >= 0 && bounds.maxX <= app.screen.width && bounds.maxY <= app.screen.height, "Full body bounds");
      assert(app.canvas === canvas, "Resize recreated canvas");
    }
    pass("desktop/tablet/mobile auto fit and ResizeObserver reuse the same static application");

    // Real GPU pixel checks: overlap all ten opaque parts, remove the frontmost
    // one at each step, and check the visible color against the required order.
    const flat = await parseCharacterSheet(await skeletonFixture("solid", true));
    const overlap = assembleCharacter(flat);
    for (const bone of Object.values(overlap.bones)) {
      bone.container.position.set(0);
      bone.sprite.anchor.set(0);
    }
    app.stage.addChild(overlap.root);
    for (const name of [...SKELETON_DRAW_ORDER].reverse()) {
      const image = app.renderer.extract.pixels({ target: overlap.root, frame: new Rectangle(0, 0, 2, 2), resolution: 1 });
      const expectedRed = 20 + (Object.keys(spec.parts) as BoneName[]).indexOf(name) * 20;
      assert(image.pixels[0] === expectedRed && image.pixels[1] === 80 && image.pixels[2] === 140, `GPU draw order: ${name}`);
      overlap.bones[name].sprite.visible = false;
    }
    overlap.destroy();
    pass("GPU pixels verify all 10 global draw layers independently of transform hierarchy");
    renderer.destroy(); renderer.destroy();
    assert(released(liveResources) && root.destroyed && destroyedApps.has(app) && !host.querySelector("canvas") && observers.size === 0, "Renderer release");
    pass("renderer destruction releases GPU resources, application, canvas and observer");

    const pending = new CharacterRenderer(host, parsed);
    pending.destroy();
    await pending.ready;
    assert(!host.querySelector("canvas") && destroyedApps.has(apps.at(-1)!), "Pending init leak");
    pass("unmount during asynchronous initialization cleans up on completion");

    const beforeFailure = Application.prototype.init;
    Application.prototype.init = async function (...args) {
      await beforeFailure.apply(this, args);
      throw new Error("Forced failure after renderer creation");
    };
    const failed = new CharacterRenderer(host, parsed);
    let rejected = false;
    try { await failed.ready; } catch { rejected = true; }
    Application.prototype.init = beforeFailure;
    assert(rejected && destroyedApps.has(apps.at(-1)!) && !host.querySelector("canvas"), "Partially initialized app leaked");
    pass("failure after renderer creation also destroys the application");

    const mount = document.querySelector("#test-app")!;
    const react = createRoot(mount);
    react.render(<StrictMode><App /></StrictMode>);
    await until(() => !!document.querySelector("input"));
    let oldCanvas: HTMLCanvasElement | null = null;
    let oldResources: ReturnType<typeof owned> | null = null;
    let oldApp: Application | null = null;
    for (const color of ["#6bbdff", "#ffad70", "#6bbdff"]) {
      select(await skeletonFixture(color));
      await until(() => !!document.querySelector(".characterCanvas canvas") && document.querySelector(".characterCanvas canvas") !== oldCanvas);
      assert(document.querySelectorAll(".characterCanvas canvas").length === 1, "Duplicate renderer");
      assert(document.querySelectorAll(".partImage canvas").length === 10, "Part Preview lost");
      if (oldResources) assert(released(oldResources) && destroyedApps.has(oldApp!), "Re-upload leak");
      oldCanvas = document.querySelector(".characterCanvas canvas");
      oldApp = apps.at(-1)!;
      oldResources = owned(oldApp.stage);
    }
    pass("StrictMode re-uploads replace the character, preserve 10 debug parts and destroy old resources");
    react.unmount();
    await until(() => apps.every((item) => destroyedApps.has(item)));
    assert(observers.size === 0 && oldResources && released(oldResources), "Unmount resources retained");
    pass("all created applications and observers are released after unmount");

    const trackedInit = Application.prototype.init;
    Application.prototype.init = async function () { throw new Error("Forced WebGL failure"); };
    const failureRoot = createRoot(mount);
    failureRoot.render(<App />);
    await until(() => !!document.querySelector("input"));
    select(file);
    await until(() => !!document.querySelector(".characterPreview")?.textContent?.includes("表示できません"));
    assert(document.querySelectorAll(".partImage canvas").length === 10, "Renderer error hid debug preview");
    Application.prototype.init = trackedInit;
    select(file);
    await until(() => !!document.querySelector(".characterCanvas canvas"));
    failureRoot.unmount();
    await until(() => apps.every((item) => destroyedApps.has(item)));
    pass("WebGL initialization failure is shown safely and re-upload recovers");
  } finally {
    host.remove();
    Application.prototype.init = originalInit;
    Application.prototype.destroy = originalDestroy;
    window.ResizeObserver = NativeObserver;
  }

  // Leave one deliberate visual fixture mounted for desktop/mobile inspection.
  const visual = createRoot(document.querySelector("#test-app")!);
  visual.render(<App />);
  await until(() => !!document.querySelector("input"));
  select(file);
  await until(() => !!document.querySelector(".characterCanvas canvas"));
  assert(document.documentElement.scrollWidth <= window.innerWidth, "Horizontal overflow");
  pass("visible neutral fixture and debug view have no horizontal overflow");
  output.textContent = `${messages.join("\n")}\nPASS: ${messages.length} checks`;
}

run().catch((error: unknown) => {
  output.textContent = `${messages.join("\n")}\nFAIL: ${String(error)}`;
});
