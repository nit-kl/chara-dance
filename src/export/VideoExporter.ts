import { EXPORT_CONFIG, EXPORT_UNSUPPORTED } from "../config/export";
import type { ExportResult } from "../types/export";

export function selectWebMMimeType(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return null;
  try { return EXPORT_CONFIG.mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? null; }
  catch { return null; }
}

export function canExportWebM(canvas?: HTMLCanvasElement | null): boolean {
  const target = canvas ?? (typeof HTMLCanvasElement !== "undefined" ? HTMLCanvasElement.prototype : null);
  return typeof target?.captureStream === "function" && selectWebMMimeType() !== null;
}

export class VideoExporter {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private resolve: ((result: ExportResult | null) => void) | null = null;
  private reject: ((reason: Error) => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopping = false;
  private result: ExportResult | null = null;

  isSupported(canvas?: HTMLCanvasElement | null) { return canExportWebM(canvas); }

  start(canvas: HTMLCanvasElement, onStarted: () => void): Promise<ExportResult | null> {
    if (this.resolve) return Promise.reject(new Error("録画はすでに進行中です。"));
    this.clearResult();
    if (!this.isSupported(canvas)) return Promise.reject(new Error(EXPORT_UNSUPPORTED));
    return new Promise((resolve, reject) => {
      this.resolve = resolve; this.reject = reject; this.stopping = false;
      try {
        this.stream = canvas.captureStream(EXPORT_CONFIG.fps);
        this.recorder = new MediaRecorder(this.stream, { mimeType: selectWebMMimeType()! });
        this.recorder.ondataavailable = (event) => { if (event.data.size > 0) this.chunks.push(event.data); };
        this.recorder.onerror = () => this.fail("動画の録画に失敗しました。もう一度お試しください。");
        this.recorder.onstart = () => {
          try { onStarted(); } catch { this.fail("アニメーションの録画を開始できませんでした。"); }
        };
        this.recorder.onstop = () => {
          if (!this.stopping) { this.fail("録画が途中で停止しました。もう一度お試しください。"); return; }
          try {
            const blob = new Blob(this.chunks, { type: this.recorder!.mimeType });
            if (!blob.size) { this.fail("動画データを作成できませんでした。もう一度お試しください。"); return; }
            this.result = { blob, url: URL.createObjectURL(blob) };
            const complete = this.resolve;
            this.cleanup();
            complete?.(this.result);
          } catch { this.fail("動画ファイルを作成できませんでした。"); }
        };
        this.recorder.start();
      } catch { this.fail("録画を開始できませんでした。ブラウザの対応状況を確認してください。"); }
    });
  }

  stop() {
    if (!this.recorder || this.stopping) return;
    this.stopping = true;
    this.timer = setTimeout(() => this.fail("録画の終了処理が完了しませんでした。"), EXPORT_CONFIG.stopTimeoutMs);
    try { this.recorder.stop(); }
    catch { this.fail("録画を終了できませんでした。もう一度お試しください。"); }
  }

  cancel() {
    const complete = this.resolve;
    this.cleanup(); this.clearResult(); complete?.(null);
  }

  private fail(message: string) {
    const reject = this.reject;
    this.cleanup(); this.clearResult(); reject?.(new Error(message));
  }

  private clearResult() {
    if (this.result) URL.revokeObjectURL(this.result.url);
    this.result = null;
  }

  private cleanup() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    if (this.recorder) {
      this.recorder.onstart = null; this.recorder.onstop = null;
      this.recorder.ondataavailable = null; this.recorder.onerror = null;
      try { if (this.recorder.state !== "inactive") this.recorder.stop(); } catch { /* Tracks below still end capture. */ }
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null; this.recorder = null; this.chunks = [];
    this.resolve = null; this.reject = null;
  }
}
