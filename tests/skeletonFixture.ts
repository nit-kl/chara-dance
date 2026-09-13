import { CHARACTER_SHEET_V1 as spec } from "../src/config/characterSheetV1";
import { SKELETON_V1 } from "../src/config/skeletonV1";
import type { BoneName } from "../src/types/character";

// Local test art, deliberately drawn in the prescribed neutral orientation.
export async function skeletonFixture(color = "#6bbdff", solid = false): Promise<File> {
  const sheet = document.createElement("canvas");
  sheet.width = spec.width;
  sheet.height = spec.height;
  const context = sheet.getContext("2d")!;
  for (const [index, name] of (Object.keys(spec.parts) as BoneName[]).entries()) {
    const part = spec.parts[name];
    context.save();
    context.translate(part.x, part.y);
    context.beginPath();
    context.rect(0, 0, part.width, part.height);
    context.clip();
    context.fillStyle = solid ? `rgb(${20 + index * 20}, 80, 140)` : color;
    if (solid) {
      context.fillRect(0, 0, part.width, part.height);
    } else if (name === "head") {
      context.beginPath();
      context.ellipse(part.width * 0.5, part.height * 0.43, part.width * 0.23, part.height * 0.42, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#171d29";
      for (const x of [0.42, 0.58]) {
        context.beginPath();
        context.arc(part.width * x, part.height * 0.4, 22, 0, Math.PI * 2);
        context.fill();
      }
      context.beginPath();
      context.arc(part.width * 0.5, part.height * 0.55, 45, 0, Math.PI);
      context.lineWidth = 12;
      context.strokeStyle = "#171d29";
      context.stroke();
    } else if (name === "body") {
      context.beginPath();
      context.roundRect(part.width * 0.2, part.height * 0.08, part.width * 0.6, part.height * 0.88, 60);
      context.fill();
    } else {
      const child = Object.values(SKELETON_V1).find((attachment) => attachment.parent === name);
      const end = child ?? { x: name.includes("Arm") ? (name.startsWith("left") ? 0.15 : 0.85) : 0.5, y: 0.85 };
      context.lineCap = "round";
      context.lineWidth = name.includes("Arm") ? 85 : 115;
      context.strokeStyle = color;
      context.beginPath();
      context.moveTo(part.pivot.x * part.width, part.pivot.y * part.height);
      context.lineTo(end.x * part.width, end.y * part.height);
      context.stroke();
    }
    context.restore();
  }
  const blob = await new Promise<Blob>((resolve, reject) => {
    sheet.toBlob((value) => value ? resolve(value) : reject(new Error("Test image encoding failed")));
  });
  return new File([blob], `skeleton-${color}.png`, { type: "image/png" });
}
