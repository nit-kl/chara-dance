export const EXPORT_CONFIG = {
  fps: 30,
  mimeTypes: ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"],
  endMarginFrames: 2,
  stopTimeoutMs: 5000,
  watchdogMultiplier: 2,
  watchdogExtraMs: 5000,
  checkerSize: 12,
  checkerColors: [0xeef1f7, 0xc8cfda],
};

export const EXPORT_UNSUPPORTED = "このブラウザでは動画出力に対応していません。";
