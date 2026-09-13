import type { MotionData } from "../types/motion";

export async function loadMotion(url: string): Promise<MotionData> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load motion: ${response.status}`);
  }

  return (await response.json()) as MotionData;
}
