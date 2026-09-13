import { Application, Graphics, Rectangle, UPDATE_PRIORITY } from "pixi.js";
import { EXPORT_CONFIG } from "../config/export";
import type { Ticker } from "pixi.js";
import { AnimationPlayer } from "../animation/AnimationPlayer";
import { ANIMATION_PREVIEW } from "../config/animationPreview";
import type { MotionData, PlaybackState } from "../types/motion";
import type { BackgroundOption } from "../types/studio";
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
  private player: AnimationPlayer | null = null;
  private neutralBounds: Rectangle | null = null;
  private lastStatus = "";
  private recording = false;
  private recordingProgress: ((time: number) => void) | null = null;
  private recordingEnd: (() => void) | null = null;
  private checker: Graphics | null = null;

  constructor(private host: HTMLElement | null, character: ParsedCharacter,
    private onPlayback?: (state: PlaybackState) => void) {
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
        backgroundAlpha: 0,
      });
      this.initialized = true;
      app.renderer.background.alpha = 1;
      if (this.disposed) {
        this.release();
        return;
      }

      this.skeleton = assembleCharacter(character);
      this.player = new AnimationPlayer(this.skeleton.bones);
      this.neutralBounds = this.skeleton.root.getLocalBounds().rectangle.clone();
      app.ticker.add(this.tick, this, UPDATE_PRIORITY.HIGH);
      app.stage.addChild(this.skeleton.root);
      app.canvas.setAttribute("role", "img");
      app.canvas.setAttribute("aria-label", "キャラクタープレビュー");
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
    if (this.recording) return;
    if (this.disposed || !this.host || !this.skeleton || !this.application) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.application.renderer.resize(width, height,
      Math.min(window.devicePixelRatio || 1, CHARACTER_PREVIEW.maxResolution));

    const root = this.skeleton.root;
    // Keep the neutral framing stable while bones move, including on resize.
    const bounds = this.neutralBounds!;
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

  get playback(): PlaybackState | null { return this.player?.state ?? null; }

  getCanvas(): HTMLCanvasElement | null {
    return this.initialized && !this.disposed ? this.application?.canvas as HTMLCanvasElement ?? null : null;
  }

  prepareRecording(background: BackgroundOption): () => void {
    if (!this.application || !this.player || this.disposed) throw new Error("録画するCanvasを取得できませんでした。");
    const speed = this.player.speed;
    this.pause(); this.reset(); this.setSpeed(1);
    this.recording = true;
    try {
      if (background.checker) {
        const app = this.application;
        const size = EXPORT_CONFIG.checkerSize;
        this.checker = new Graphics();
        for (let y = 0; y < app.screen.height; y += size) {
          for (let x = 0; x < app.screen.width; x += size) {
            this.checker.rect(x, y, size, size).fill(EXPORT_CONFIG.checkerColors[(x / size + y / size) % 2]);
          }
        }
        app.stage.addChildAt(this.checker, 0);
        app.renderer.background.alpha = 1;
      }
      this.application.render();
    } catch (error) {
      this.restoreRecording(background, speed);
      throw error;
    }
    return () => this.restoreRecording(background, speed);
  }

  private restoreRecording(background: BackgroundOption, speed: number) {
    this.recordingProgress = null; this.recordingEnd = null;
    this.checker?.destroy(); this.checker = null;
    this.recording = false;
    this.reset(); this.setSpeed(speed); this.setBackground(background); this.resize();
  }

  playOnce(progress: (time: number) => void, end: () => void) {
    if (!this.player || !this.application || this.disposed) throw new Error("キャラクターの録画を開始できませんでした。");
    this.recordingProgress = progress; this.recordingEnd = end;
    this.player.play(true);
    this.application.render(); // Capture the time-zero motion pose before advancing.
    this.application.start();
  }

  setBackground(background: BackgroundOption) {
    if (!this.initialized || this.disposed || !this.application) return;
    this.application.renderer.background.color = background.color;
    this.application.renderer.background.alpha = background.alpha;
    this.application.render();
  }

  setMotion(motion: MotionData) {
    if (!this.player || this.disposed) return;
    this.player.setMotion(motion);
    this.application?.stop();
    this.application?.render();
    this.notify(true);
  }

  play() {
    if (!this.player || this.disposed) return;
    this.player.play();
    if (this.player.isPlaying) this.application?.start();
    this.notify(true);
  }

  pause() {
    if (!this.initialized || this.disposed) return;
    this.player?.pause();
    this.application?.stop();
    this.notify(true);
  }

  reset() {
    if (!this.initialized || this.disposed) return;
    this.player?.reset();
    this.application?.stop();
    if (this.initialized && !this.disposed) this.application?.render();
    this.notify(true);
  }

  setSpeed(speed: number) {
    this.player?.setSpeed(speed);
    this.notify(true);
  }

  private tick(ticker: Ticker) {
    this.player?.update((this.recording ? ticker.elapsedMS : ticker.deltaMS) / 1000);
    if (this.recording) {
      this.recordingProgress?.(this.player?.currentTime ?? 0);
      if (!this.player?.isPlaying && this.recordingEnd) {
        const end = this.recordingEnd; this.recordingEnd = null;
        this.application?.render(); // Final pose must be painted before MediaRecorder.stop.
        end();
      }
    }
    if (!this.player?.isPlaying) this.application?.stop();
    this.notify();
  }

  private notify(force = false) {
    const state = this.playback;
    if (!state || this.disposed) return;
    const key = `${Math.floor(state.currentTime * ANIMATION_PREVIEW.statusUpdatesPerSecond)}:${state.isPlaying}:${state.speed}`;
    if (force || key !== this.lastStatus) {
      this.lastStatus = key;
      this.onPlayback?.(state);
    }
  }

  private release() {
    this.recordingProgress = null; this.recordingEnd = null;
    this.checker?.destroy(); this.checker = null;
    if (this.initialized) {
      this.application?.stop();
      this.application?.ticker.remove(this.tick, this);
    }
    this.player?.destroy();
    this.player = null;
    this.onPlayback = undefined;
    this.neutralBounds = null;
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
