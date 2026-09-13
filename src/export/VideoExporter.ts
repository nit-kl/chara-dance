export function canExportWebM(canvas: HTMLCanvasElement): boolean {
  return (
    typeof canvas.captureStream === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}
