import type { BoneNode } from "../types/skeleton";
import type { BoneName } from "../types/character";
import type { MotionData, PlaybackState } from "../types/motion";
import { degreesToRadians, sampleTrack } from "./interpolation";
import { validateMotion } from "./MotionLoader";

export class AnimationPlayer {
  private targets: { bone: BoneNode; x: number; y: number }[];
  private motion: MotionData | null = null;
  private time = 0;
  private rate = 1;
  private playing = false;
  private once = false;

  constructor(bones: Record<BoneName, BoneNode>) {
    // Capture connections once, before any animation is applied.
    this.targets = Object.values(bones).map((bone) => ({ bone, x: bone.container.x, y: bone.container.y }));
  }

  get currentTime() { return this.time; }
  get duration() { return this.motion?.duration ?? 0; }
  get speed() { return this.rate; }
  get isPlaying() { return this.playing; }
  get state(): PlaybackState {
    return { currentTime: this.time, duration: this.duration, speed: this.rate, isPlaying: this.playing };
  }

  setMotion(motion: MotionData) {
    const validated = validateMotion(motion); // Own a validated copy; callers cannot mutate playback data.
    this.reset();
    this.motion = validated;
  }

  play(once = false) {
    if (!this.motion || !this.targets.length) return;
    if (this.time >= this.duration) this.time = 0;
    this.playing = true;
    this.once = once;
    this.apply();
  }

  pause() { this.playing = false; }

  reset() {
    this.playing = false;
    this.time = 0;
    for (const { bone, x, y } of this.targets) {
      bone.container.position.set(x, y);
      bone.container.rotation = 0;
      bone.container.scale.set(1);
    }
  }

  setSpeed(speed: number) {
    if (!Number.isFinite(speed) || speed <= 0) throw new Error("再生速度は有限の正数にしてください。");
    this.rate = speed;
  }

  update(deltaSeconds: number) {
    if (!this.playing || !this.motion || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return;
    const next = this.time + deltaSeconds * this.rate;
    if (!Number.isFinite(next)) return;
    if (this.motion.loop && !this.once) this.time = next % this.duration;
    else {
      this.time = Math.min(next, this.duration);
      if (this.time === this.duration) this.playing = false;
    }
    this.apply();
  }

  private apply() {
    for (const { bone, x, y } of this.targets) {
      const value = sampleTrack(this.motion?.tracks[bone.name], this.time);
      bone.container.position.set(x + value.x, y + value.y);
      bone.container.rotation = degreesToRadians(value.rotation);
      bone.container.scale.set(value.scaleX, value.scaleY);
    }
  }

  destroy() {
    this.reset();
    this.targets = [];
    this.motion = null;
  }
}
