import { Application, Point } from "pixi.js";
import { parseCharacterSheet } from "../src/character/CharacterSheetParser";
import { assembleCharacter } from "../src/character/CharacterAssembler";
import { AnimationPlayer } from "../src/animation/AnimationPlayer";
import { loadMotion } from "../src/animation/MotionLoader";
import { CHARACTER_SHEET_V1 } from "../src/config/characterSheetV1";
import { SAMPLE_CHARACTER } from "../src/config/sample";
import { MOTIONS } from "../src/config/motions";
import type { BoneName } from "../src/types/character";

const output = document.querySelector("#results")!;
const results: string[] = [];
function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function pass(text: string) { results.push(`PASS ${text}`); output.textContent = results.join("\n"); }
async function run() {
  const app = new Application();
  await app.init({ width: 640, height: 800, preference: "webgl", autoStart: false, background: "#171d29", antialias: true });
  const parsed = await parseCharacterSheet(new File([await (await fetch(SAMPLE_CHARACTER.path)).blob()], SAMPLE_CHARACTER.filename, { type: "image/png" }));
  const skeleton = assembleCharacter(parsed), player = new AnimationPlayer(skeleton.bones);
  app.stage.addChild(skeleton.root);
  const bounds = skeleton.root.getLocalBounds();
  const fit = Math.min(640 * .7 / bounds.width, 800 * .85 / bounds.height);
  skeleton.root.scale.set(fit);
  skeleton.root.position.set(320 - (bounds.x + bounds.width / 2) * fit, 400 - (bounds.y + bounds.height / 2) * fit);
  const sheet = document.querySelector<HTMLCanvasElement>("#poses")!, ctx = sheet.getContext("2d")!;
  try {
    for (const option of MOTIONS) {
      const motion = await loadMotion(option.path);
      const names = Object.keys(CHARACTER_SHEET_V1.parts) as BoneName[];
      for (const name of names) {
        const track = motion.tracks[name]!;
        assert(track.length >= 100, `${name} missing authored motion`);
        const rotations = track.map((key) => key.rotation ?? 0);
        assert(Math.max(...rotations) - Math.min(...rotations) > 2, `${name} static`);
        const { time: startTime, ...first } = track[0], { time: endTime, ...last } = track.at(-1)!;
        assert(startTime === 0 && endTime === motion.duration && JSON.stringify(first) === JSON.stringify(last), `${name} loop discontinuity`);
        assert(track.every((key) => !key.scaleX && !key.scaleY && (name === "body" || (!key.x && !key.y))), "Limb stretching or disconnected joints");
      }
      pass(`${option.id}: ten moving bones, closed loop and rigid connected limbs`);

      const soles = () => (['leftLowerLeg', 'rightLowerLeg'] as const).map((name) => {
        const part = CHARACTER_SHEET_V1.parts[name];
        return skeleton.bones[name].container.toGlobal(new Point(0, (.95 - part.pivot.y) * part.height)).y;
      });
      player.reset(); const floor = Math.max(...soles());
      player.setMotion(motion); player.play();
      let previous = names.map((name) => skeleton.bones[name].container.rotation);
      for (let frame = 0; frame < 480; frame++) {
        const footError = Math.abs(Math.max(...soles()) - floor);
        assert(footError < 1, `Floor drift ${footError}`);
        const current = names.map((name) => skeleton.bones[name].container.rotation);
        assert(current.every((value, i) => Math.abs(value - previous[i]) < .20), "Abrupt angular jump");
        previous = current;
        player.update(1 / 120);
      }
      pass(`${option.id}: actual Pixi transforms keep sole height and continuous motion between keys`);
      if (option.id === 'cute-dance') {
        for (let pose = 0; pose < 8; pose++) {
          player.reset(); player.play(); player.update(pose * .5); app.render();
          const x = (pose % 4) * 320, y = Math.floor(pose / 4) * 440;
          ctx.drawImage(app.canvas, x, y, 320, 400);
          ctx.fillStyle = '#171d29'; ctx.fillRect(x, y + 400, 320, 40);
          ctx.fillStyle = '#ffffff'; ctx.font = '18px sans-serif'; ctx.fillText(`${pose + 1}  /  ${(pose * .5).toFixed(1)} sec`, x + 16, y + 426);
        }
      }
    }
  } finally { player.destroy(); skeleton.destroy(); app.destroy(true); }
  output.textContent = `${results.join("\n")}\nPASS: ${results.length} checks`;
}
void run().catch((error: unknown) => { output.textContent = `${results.join("\n")}\nFAIL: ${String(error)}`; });
