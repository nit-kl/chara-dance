import { CHARACTER_SHEET_V1 as spec } from "../src/config/characterSheetV1";
import { SKELETON_V1 } from "../src/config/skeletonV1";
import type { BoneName } from "../src/types/character";

// Manually identified regions/joints in the supplied 1254px artwork.
// Development-only format conversion; runtime parsing still uses the shared config.
type Point = [number, number];
type Region = { crop: [number, number, number, number]; start: Point; end?: Point; thickness: number };
const regions: Record<BoneName, Region> = {
  head: { crop: [45, 0, 635, 451], start: [367, 365], thickness: 1.05 },
  body: { crop: [690, 0, 480, 466], start: [930, 238], thickness: 1.04 },
  leftUpperArm: { crop: [253, 454, 239, 166], start: [454, 483], end: [335, 584], thickness: .9 },
  rightUpperArm: { crop: [769, 454, 237, 166], start: [800, 483], end: [919, 584], thickness: .9 },
  leftLowerArm: { crop: [77, 621, 331, 172], start: [378, 647], end: [150, 749], thickness: .85 },
  rightLowerArm: { crop: [846, 621, 331, 172], start: [876, 647], end: [1104, 749], thickness: .85 },
  leftUpperLeg: { crop: [279, 740, 159, 201], start: [328, 772], end: [387, 914], thickness: 1.1 },
  rightUpperLeg: { crop: [816, 740, 159, 201], start: [926, 772], end: [867, 914], thickness: 1.1 },
  leftLowerLeg: { crop: [293, 939, 134, 310], start: [382, 962], end: [352, 1200], thickness: 1.2 },
  rightLowerLeg: { crop: [827, 939, 134, 310], start: [872, 962], end: [902, 1200], thickness: 1.2 },
};

async function prepare() {
  const response = await fetch("./source-idol.png");
  if (!response.ok) throw new Error("Source image unavailable");
  const bitmap = await createImageBitmap(await response.blob());
  const sheet = document.createElement("canvas"); sheet.width = spec.width; sheet.height = spec.height;
  const ctx = sheet.getContext("2d")!;
  try {
    for (const name of Object.keys(spec.parts) as BoneName[]) {
      const part = spec.parts[name], region = regions[name];
      const px = part.pivot.x * part.width, py = part.pivot.y * part.height;
      ctx.save(); ctx.translate(part.x, part.y);
      ctx.beginPath(); ctx.rect(0, 0, part.width, part.height); ctx.clip();
      ctx.translate(px, py);
      if (region.end) {
        const attachment = Object.values(SKELETON_V1).find((joint) => joint.parent === name);
        const end = attachment ?? (name.includes("Arm")
          ? { x: name.startsWith("left") ? .62 : .38, y: .49 }
          : { x: .5, y: .85 });
        const dx = end.x * part.width - px, dy = end.y * part.height - py;
        const sx = region.end[0] - region.start[0], sy = region.end[1] - region.start[1];
        ctx.rotate(Math.atan2(dy, dx));
        ctx.scale(Math.hypot(dx, dy) / Math.hypot(sx, sy), region.thickness);
        ctx.rotate(-Math.atan2(sy, sx));
      } else ctx.scale(region.thickness, region.thickness);
      ctx.translate(-region.start[0], -region.start[1]);
      if (name === "body") {
        // The source torso includes sleeves also supplied as separate upper arms.
        // Keep the bodice and skirt, excluding those duplicate sleeve silhouettes.
        const outline = [[824, 0], [1036, 0], [1036, 85], [1029, 143], [1013, 215],
          [1024, 269], [1170, 330], [1170, 466], [690, 466], [690, 330],
          [836, 269], [847, 215], [831, 143], [824, 85]];
        ctx.beginPath();
        outline.forEach(([x, y], index) => { if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
        ctx.closePath(); ctx.clip();
      }
      if (name.includes("LowerArm")) {
        // Exclude the neighboring thigh in the rectangular source crop.
        const outline = [[77, 621], [408, 621], [408, 704], [247, 741], [232, 793], [77, 793]];
        ctx.beginPath();
        outline.forEach(([x, y], index) => {
          const sourceX = name.startsWith("left") ? x : bitmap.width - x;
          if (index === 0) ctx.moveTo(sourceX, y); else ctx.lineTo(sourceX, y);
        });
        ctx.closePath(); ctx.clip();
      }
      const [x, y, w, h] = region.crop;
      ctx.drawImage(bitmap, x, y, w, h, x, y, w, h);
      ctx.restore();
    }
    document.querySelector<HTMLAnchorElement>("#sample-art")!.href = sheet.toDataURL("image/png");
    sheet.style.width = "512px"; document.body.append(sheet);
    document.querySelector("#results")!.textContent = "PASS: 1 checks";
  } finally { bitmap.close(); }
}
void prepare().catch((error: unknown) => { document.querySelector("#results")!.textContent = `FAIL: ${String(error)}`; });
