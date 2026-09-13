import { Application } from "pixi.js";
import { CHARACTER_PREVIEW } from "../config/characterPreview";
import type { ParsedCharacter } from "../types/character";
import type { AssembledCharacter } from "../types/skeleton";
import { assembleCharacter } from "./CharacterAssembler";

export class CharacterRenderer {
  readonly ready: Promise<void>;
  private application: Application | null = new Application();
  private skeleton: AssembledCharacter | null = null;
  private observer: ResizeObserver | null = null;
  private initialized = false;
  private disposed = false;

  constructor(private host: HTMLElement | null, character: ParsedCharacter) {
    this.ready = this.initialize(character);
  }

  private async initialize(character: ParsedCharacter) {
    const app = this.application!;
    try {
      await app.init({
        preference: "webgl",
        autoStart: false,
        sharedTicker: false,
        antialias: true,
        autoDensity: true,
        background: CHARACTER_PREVIEW.background,
      });
      this.initialized = true;
      if (this.disposed) {
        this.release();
        return;
      }

      this.skeleton = assembleCharacter(character);
      app.stage.addChild(this.skeleton.root);
      app.canvas.setAttribute("role", "img");
      app.canvas.setAttribute("aria-label", "Neutral Poseのキャラクター全身");
      this.host!.appendChild(app.canvas);
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(this.host!);
      this.resize();
    } catch (error) {
      this.disposed = true;
      this.release();
      throw error;
    }
  }

  private resize() {
    if (this.disposed || !this.host || !this.skeleton || !this.application) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.application.renderer.resize(width, height,
      Math.min(window.devicePixelRatio || 1, CHARACTER_PREVIEW.maxResolution));

    const root = this.skeleton.root;
    const bounds = root.getLocalBounds();
    const scale = Math.min(
      width * CHARACTER_PREVIEW.maxWidthRatio / Math.max(1, bounds.width),
      height * CHARACTER_PREVIEW.maxHeightRatio / Math.max(1, bounds.height),
    );
    root.scale.set(scale);
    root.position.set(
      width / 2 - (bounds.x + bounds.width / 2) * scale,
      height / 2 - (bounds.y + bounds.height / 2) * scale,
    );
    this.application.render();
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.host = null;
    // Application.init is asynchronous. A pending initialization cleans itself
    // up on completion, before assembling textures or attaching a canvas.
    if (this.initialized) this.release();
  }

  private release() {
    this.observer?.disconnect();
    this.observer = null;
    this.skeleton?.destroy();
    this.skeleton = null;
    if (this.application) {
      // init can reject after creating a renderer (for example in a plugin).
      if (this.application.renderer) this.application.destroy({ removeView: true }, { children: true });
      else this.application.stage.destroy({ children: true });
    }
    this.application = null;
    this.host = null;
  }
}
