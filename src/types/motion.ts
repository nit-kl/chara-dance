import type { BoneName } from "./character";

export type MotionKeyframe = {
  time: number;
  rotation?: number;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
};

export type MotionData = {
  id: string;
  name: string;
  duration: number;
  loop: boolean;
  tracks: Partial<Record<BoneName, MotionKeyframe[]>>;
};
