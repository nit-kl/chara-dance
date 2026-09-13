import { CHARACTER_SHEET_V1 } from "../config/characterSheetV1";
import type { BoneName } from "../types/character";
import type { MotionData, MotionKeyframe } from "../types/motion";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateMotion(value: unknown): MotionData {
  if (!record(value) || typeof value.id !== "string" || !value.id.trim()
    || typeof value.name !== "string" || !value.name.trim()
    || !finite(value.duration) || value.duration <= 0
    || typeof value.loop !== "boolean" || !record(value.tracks)) {
    throw new Error("モーションの基本情報が不正です。");
  }
  const tracks: MotionData["tracks"] = {};
  const duration = value.duration;
  for (const [name, frames] of Object.entries(value.tracks)) {
    if (!Object.hasOwn(CHARACTER_SHEET_V1.parts, name) || !Array.isArray(frames)) {
      throw new Error("モーションのBone名またはtrackが不正です。");
    }
    let previous = -1;
    tracks[name as BoneName] = frames.map((frame: unknown) => {
      if (!record(frame) || !finite(frame.time) || frame.time < 0
        || frame.time > duration || frame.time <= previous) {
        throw new Error("キーフレームの時刻は範囲内の昇順にしてください。");
      }
      previous = frame.time;
      const result: MotionKeyframe = { time: frame.time };
      for (const property of ["rotation", "x", "y", "scaleX", "scaleY"] as const) {
        if (Object.hasOwn(frame, property)) {
          if (!finite(frame[property])) throw new Error("Transformは有限数で指定してください。");
          result[property] = frame[property];
        }
      }
      return result;
    });
  }
  return { id: value.id, name: value.name, duration: value.duration, loop: value.loop, tracks };
}

export async function loadMotion(url: string, signal?: AbortSignal): Promise<MotionData> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Failed to load motion: ${response.status}`);
  }

  return validateMotion(await response.json());
}
