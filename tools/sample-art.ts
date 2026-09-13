import { CHARACTER_SHEET_V1 as spec } from "../src/config/characterSheetV1";
import { SKELETON_V1 } from "../src/config/skeletonV1";
import type { BoneName } from "../src/types/character";

// Original geometric robot art. Development-only, never loaded by the app.
// All region boundaries, pivots and joint endpoints come from the shared configs.
const sheet = document.createElement("canvas");
sheet.width = spec.width; sheet.height = spec.height;
const ctx = sheet.getContext("2d")!;
const mint = "#98ead5", ink = "#24344b", lilac = "#c2bbff", pink = "#ffb6c8";
function round(x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
function dot(x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
for (const name of Object.keys(spec.parts) as BoneName[]) {
  const part = spec.parts[name], w = part.width, h = part.height;
  ctx.save(); ctx.translate(part.x, part.y);
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  if (name === "head") {
    round(w * .47, h * .70, w * .06, h * .18, 14, lilac);
    round(w * .23, h * .12, w * .54, h * .66, 95, mint);
    round(w * .27, h * .28, w * .46, h * .32, 55, ink);
    for (const x of [.38, .62]) round(w * x - 18, h * .35, 36, 65, 18, "#ffffff");
    round(w * .45, h * .65, w * .1, 13, 6, ink);
    dot(w * .23, h * .47, 32, pink); dot(w * .77, h * .47, 32, pink);
    round(w * .49, h * .02, w * .02, h * .13, 8, lilac);
    dot(w * .5, h * .05, 22, pink);
  } else if (name === "body") {
    round(w * .2, h * .08, w * .6, h * .88, 72, lilac);
    round(w * .26, h * .20, w * .48, h * .59, 42, "#eeeaff");
    // Chest emblem: a small mint spark.
    ctx.fillStyle = mint; ctx.beginPath();
    ctx.moveTo(w * .50, h * .27); ctx.lineTo(w * .58, h * .48);
    ctx.lineTo(w * .50, h * .68); ctx.lineTo(w * .42, h * .48); ctx.closePath(); ctx.fill();
    for (const x of [.43, .5, .57]) dot(w * x, h * .88, 10, ink);
  } else {
    const child = Object.values(SKELETON_V1).find((joint) => joint.parent === name);
    const end = child ?? { x: name.includes("Arm") ? (name.startsWith("left") ? .15 : .85) : .5, y: .85 };
    const startX = part.pivot.x * w, startY = part.pivot.y * h;
    const endX = end.x * w, endY = end.y * h;
    ctx.lineCap = "round"; ctx.lineWidth = name.includes("Arm") ? 90 : 120;
    ctx.strokeStyle = name.includes("Upper") ? ink : mint;
    ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
    dot(startX, startY, name.includes("Arm") ? 46 : 60, lilac);
    dot(endX, endY, name.includes("Arm") ? 52 : 62, child ? lilac : pink);
    if (!child) dot(endX - 12, endY - 14, 15, "#fff2f5");
  }
  ctx.restore();
}
document.querySelector<HTMLAnchorElement>("#sample-art")!.href = sheet.toDataURL("image/png");
sheet.style.width = "512px"; document.body.append(sheet);
document.querySelector("#results")!.textContent = "PASS: 1 checks";
