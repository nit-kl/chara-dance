import type { MotionKeyframe, MotionTransform } from "../types/motion";

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function degreesToRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

function transform(frame?: MotionKeyframe): MotionTransform {
  return {
    rotation: frame?.rotation ?? 0,
    x: frame?.x ?? 0,
    y: frame?.y ?? 0,
    scaleX: frame?.scaleX ?? 1,
    scaleY: frame?.scaleY ?? 1,
  };
}

export function sampleTrack(frames: readonly MotionKeyframe[] | undefined, time: number): MotionTransform {
  if (!frames?.length) return transform();
  const next = frames.findIndex((frame) => frame.time > time);
  if (next === -1) return transform(frames[frames.length - 1]);
  const from = next === 0 ? undefined : frames[next - 1];
  const to = frames[next];
  const start = transform(from);
  const end = transform(to);
  const startTime = from?.time ?? 0;
  const t = Math.max(0, Math.min(1, (time - startTime) / (to.time - startTime)));
  return {
    rotation: lerp(start.rotation, end.rotation, t),
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    scaleX: lerp(start.scaleX, end.scaleX, t),
    scaleY: lerp(start.scaleY, end.scaleY, t),
  };
}
