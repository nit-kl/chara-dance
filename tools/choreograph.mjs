import { writeFile } from 'node:fs/promises';
import { CHARACTER_SHEET_V1 as sheet } from '../src/config/characterSheetV1.ts';
import { SKELETON_V1 as joints } from '../src/config/skeletonV1.ts';
import { degreesToRadians } from '../src/animation/interpolation.ts';

const duration = 4;
const samplesPerSecond = 60;
const names = Object.keys(sheet.parts);
// Quarter-second poses: lean, travel, head, upper arms, forearms, thighs, shins.
// Arm signs follow screen coordinates, not anatomical left/right conventions.
const cute = [
  [-3,-32, 3, -38, 45,  35,-12, -18, 13, 18,-13],
  [-5,-46, 5, -30, 30,  60,-30, -22,  7, 22, -5],
  [ 3, 32,-3, -45, 38,  12,-35, -13,18,13,-18],
  [ 5, 46,-5, -30, 30,  30,-60,  -7,22, 5,-22],
  [-3,-30, 4, -36, 34, 130,-130,-20,12,20,-12],
  [-2,-24, 2, -30, 30, 140,-140,-25, 8,28, -5],
  [ 3, 32,-4,  54, 26,  35,-120,-12,20,12,-20],
  [ 4, 40,-3,  72, 18,  15,-105, -7,25, 3,-28],
  [-3,-32, 4, -26,-54, 120, -35,-20,12,20,-12],
  [-4,-40, 3, -18,-72, 105, -15,-25, 7,28, -3],
  [ 1, 12,-2,   0,  0,  10, -10,-16,16,16,-16],
  [ 0,  0, 0,  60,-60,  15, -15,-25,25,32,-32],
  [-4,-38, 5,  10, 32, 100,-128,-21,11,21,-11],
  [ 2, 18,-2, -16, 22, 112,-120,-16,18,16,-18],
  [ 4, 40,-4, -22,-10, 120, -90,-10,22,10,-22],
  [ 1, 10, 0, -30,  0, 122, -70,-16,17,16,-17],
];
const gentle = [
  [-3,-24, 3,-38,30, 82,-98,-19,14,19,-14],
  [-4,-30, 4,-34,26, 92,-108,-22,12,22,-12],
  [-2,-18, 2,-30,20,105,-115,-20,14,20,-14],
  [ 0,  0, 0,-26,26,112,-112,-17,17,17,-17],
  [ 3, 24,-3,-30,38, 98,-82,-14,19,14,-19],
  [ 4, 30,-4,-26,34,108,-92,-12,22,12,-22],
  [ 2, 18,-2,-20,30,115,-105,-14,20,14,-20],
  [ 0,  0, 0,-26,26,112,-112,-17,17,17,-17],
  [-3,-24, 3,-25,15,110,-90,-19,14,19,-14],
  [-4,-30, 4,-15, 5,120,-82,-22,12,22,-12],
  [-2,-18, 2,  0,-5,125,-70,-20,14,20,-14],
  [ 0,  0, 0, 10,-10,110,-80,-17,17,17,-17],
  [ 3, 24,-3,  5,-15, 95,-95,-14,19,14,-19],
  [ 4, 30,-4, -5, 0, 85,-108,-12,22,12,-22],
  [ 2, 18,-2,-20,15, 80,-110,-14,20,14,-20],
  [ 0,  0, 0,-32,25, 80,-104,-17,17,17,-17],
];
const channels = ['body', 'x', 'head', 'leftUpperArm', 'rightUpperArm',
  'leftLowerArm', 'rightLowerArm', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg'];
const wrap = (time) => ((time % duration) + duration) % duration;
function poseAt(poses, time, channel) {
  const phase = wrap(time) * 4;
  const index = Math.floor(phase);
  const t = phase - index;
  const column = channels.indexOf(channel);
  const value = (offset) => poses[(index + offset + poses.length) % poses.length][column];
  // Periodic cubic B-spline: preserve momentum through counts and the loop seam.
  // Convex weights also keep every channel inside the authored pose range.
  return ((1 - t) ** 3 * value(-1)
    + (3 * t ** 3 - 6 * t * t + 4) * value(0)
    + (-3 * t ** 3 + 3 * t * t + 3 * t + 1) * value(1)
    + t ** 3 * value(2)) / 6;
}
function rotate(point, angle) {
  const r = degreesToRadians(angle), c = Math.cos(r), s = Math.sin(r);
  return { x: point.x * c - point.y * s, y: point.x * s + point.y * c };
}
function attachment(child) {
  const joint = joints[child], parent = sheet.parts[joint.parent];
  return { x: (joint.x - parent.pivot.x) * parent.width, y: (joint.y - parent.pivot.y) * parent.height };
}
function sole(side, rotations) {
  const upper = `${side}UpperLeg`, lower = `${side}LowerLeg`, part = sheet.parts[lower];
  // Sample sheet sole near 95% of the lower-leg rectangle. This is an authoring
  // contact marker, not a second pivot or a runtime joint definition.
  const toe = rotate({ x: 0, y: (.95 - part.pivot.y) * part.height }, rotations[lower]);
  const knee = attachment(lower), hip = attachment(upper);
  const leg = rotate({ x: knee.x + toe.x, y: knee.y + toe.y }, rotations[upper]);
  return rotate({ x: hip.x + leg.x, y: hip.y + leg.y }, rotations.body);
}
const neutral = Object.fromEntries(names.map((name) => [name, 0]));
const floor = Math.max(sole('left', neutral).y, sole('right', neutral).y);
const round = (value) => Number(value.toFixed(5));
for (const [id, name, poses] of [['cute-dance', 'Cute Dance', cute], ['gentle-sway', 'Gentle Sway', gentle]]) {
  const tracks = Object.fromEntries(names.map((bone) => [bone, []]));
  for (let frame = 0; frame <= duration * samplesPerSecond; frame++) {
    const time = frame / samplesPerSecond;
    const rotations = Object.fromEntries(names.map((bone) => {
      const lag = bone === 'head' ? .055 : bone.includes('LowerArm') ? .035 : 0;
      return [bone, poseAt(poses, time - lag, bone)];
    }));
    // Counter-tilt keeps the face oriented toward the audience.
    rotations.head -= rotations.body * .65;
    const leftSole = sole('left', rotations).y, rightSole = sole('right', rotations).y;
    // Smooth the contact handover without a visible floor gap (at most 0.375px).
    const contactHeight = (leftSole + rightSole + Math.hypot(leftSole - rightSole, .75)) / 2;
    const y = floor - contactHeight;
    for (const bone of names) {
      const key = { time: round(time), rotation: round(rotations[bone]) };
      if (bone === 'body') { key.x = round(poseAt(poses, time, 'x')); key.y = round(y); }
      tracks[bone].push(key);
    }
  }
  const motion = { id, name, duration, loop: true, tracks };
  await writeFile(new URL(`../public/motions/${id}.json`, import.meta.url), JSON.stringify(motion, null, 2) + '\n');
}
