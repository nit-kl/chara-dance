import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Check sampled motion derivatives, including the wrap, rather than only poses.
for (const id of ['cute-dance', 'gentle-sway']) {
  const motion = JSON.parse(await readFile(new URL(`../public/motions/${id}.json`, import.meta.url), 'utf8'));
  let peakSpeed = 0, peakAcceleration = 0;
  for (const [bone, track] of Object.entries(motion.tracks)) {
    const { time: start, ...first } = track[0];
    const { time: end, ...last } = track.at(-1);
    assert.equal(start, 0);
    assert.equal(end, motion.duration);
    assert.deepEqual(first, last, `${id}/${bone}: loop pose`);
    const frames = track.slice(0, -1);
    const dt = motion.duration / frames.length;
    for (let i = 0; i < frames.length; i++) {
      const previous = frames[(i + frames.length - 1) % frames.length].rotation;
      const current = frames[i].rotation;
      const next = frames[(i + 1) % frames.length].rotation;
      peakSpeed = Math.max(peakSpeed, Math.abs(next - current) / dt);
      peakAcceleration = Math.max(peakAcceleration, Math.abs(next - 2 * current + previous) / dt ** 2);
    }
  }
  assert(peakSpeed < 400, `${id}: excessive angular speed ${peakSpeed}`);
  assert(peakAcceleration < 4000, `${id}: abrupt acceleration ${peakAcceleration}`);
  console.log(`PASS ${id}: closed loop; peak speed ${peakSpeed.toFixed(1)} deg/s; peak acceleration ${peakAcceleration.toFixed(1)} deg/s²`);
}
