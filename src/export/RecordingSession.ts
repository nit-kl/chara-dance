import { VideoExporter, canExportWebM } from "./VideoExporter";
import { EXPORT_CONFIG, EXPORT_UNSUPPORTED } from "../config/export";
import type { CharacterRenderer } from "../character/CharacterRenderer";
import type { BackgroundOption } from "../types/studio";
import type { ExportState } from "../types/export";

export const emptyExportState = (): ExportState => ({ phase: "idle", currentTime: 0, duration: 0, url: null, filename: "dance.webm", error: null });

export class RecordingSession {
  private exporter = new VideoExporter();
  private restore: (() => void) | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private generation = 0;
  private state = emptyExportState();
  constructor(private onState: (state: ExportState) => void) {}
  get isRecording() { return this.state.phase === "recording"; }
  private emit(state: ExportState) { this.state = state; this.onState(state); }

  async start(renderer: CharacterRenderer, background: BackgroundOption, motionId: string) {
    if (this.isRecording) return;
    this.clear();
    const id = ++this.generation;
    const canvas = renderer.getCanvas();
    if (!canvas) { this.emit({ ...emptyExportState(), phase: "error", error: "キャラクターを録画できませんでした。画像をもう一度選んでください。" }); return; }
    if (!canExportWebM(canvas)) { this.emit({ ...emptyExportState(), phase: "unsupported", error: EXPORT_UNSUPPORTED }); return; }
    const duration = renderer.playback?.duration ?? 0;
    if (!(duration > 0)) return;
    const slug = motionId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 80) || "dance";
    this.emit({ ...emptyExportState(), phase: "recording", duration, filename: `chara-dance-${slug}.webm` });
    try {
      this.restore = renderer.prepareRecording(background);
      document.addEventListener("visibilitychange", this.visibility);
      this.timers.push(setTimeout(() => this.cancel("録画が進行しませんでした。画面を開いた状態で再試行してください。"),
        duration * 1000 * EXPORT_CONFIG.watchdogMultiplier + EXPORT_CONFIG.watchdogExtraMs));
      const result = await this.exporter.start(canvas, () => {
        renderer.playOnce((currentTime) => {
          if (id === this.generation) this.emit({ ...this.state, currentTime });
        }, () => {
          this.timers.push(setTimeout(() => this.exporter.stop(), EXPORT_CONFIG.endMarginFrames / EXPORT_CONFIG.fps * 1000));
        });
      });
      if (id !== this.generation) return;
      this.finish();
      if (result) this.emit({ ...this.state, phase: "ready", currentTime: duration, url: result.url });
    } catch {
      if (id !== this.generation) return;
      this.exporter.cancel();
      this.finish();
      this.emit({ ...this.state, phase: "error", url: null, error: "動画を作成できませんでした。もう一度お試しください。" });
    }
  }

  cancel(error?: string) {
    this.generation++;
    this.exporter.cancel(); this.finish();
    this.emit({ ...emptyExportState(), phase: error ? "error" : "idle", error: error ?? null });
  }
  clear() { this.cancel(); }
  private visibility = () => { if (document.hidden && this.isRecording) this.cancel("録画を中止しました。画面を開いた状態で再試行してください。"); };
  private finish() {
    this.timers.forEach(clearTimeout); this.timers = [];
    document.removeEventListener("visibilitychange", this.visibility);
    const restore = this.restore;
    this.restore = null;
    restore?.();
  }
}
