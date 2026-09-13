import { CanvasSource, Container, RenderLayer, Sprite, Texture } from "pixi.js";
import { CHARACTER_SHEET_V1 } from "../config/characterSheetV1";
import { SKELETON_DRAW_ORDER, SKELETON_V1 } from "../config/skeletonV1";
import type { BoneName, ParsedCharacter } from "../types/character";
import type { AssembledCharacter, BoneNode } from "../types/skeleton";

export function assembleCharacter(character: ParsedCharacter): AssembledCharacter {
  const root = new Container({ label: "root" });
  const layer = new RenderLayer();
  const bones = {} as Record<BoneName, BoneNode>;
  const textures: Texture[] = [];
  let destroyed = false;

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    layer.detachAll();
    root.destroy({ children: true });
    for (const texture of textures) texture.destroy(true);
    textures.length = 0;
    for (const bone of Object.values(bones)) bone.children.length = 0;
  }

  try {
    // Explicit ownership avoids the global Texture.from cache and preserves the
    // original canvases for the independent Part Preview, even after destruction.
    for (const name of Object.keys(CHARACTER_SHEET_V1.parts) as BoneName[]) {
      const spec = CHARACTER_SHEET_V1.parts[name];
      const source = new CanvasSource({ resource: character.parts[name].canvas, resolution: 1 });
      const texture = new Texture({ source, label: name });
      textures.push(texture);
      const container = new Container({ label: name });
      const sprite = new Sprite({ texture, anchor: spec.pivot });
      container.addChild(sprite);
      root.addChild(container); // Ensure partial assemblies are also owned on failure.
      bones[name] = { name, container, sprite, children: [] };
    }

    for (const name of Object.keys(bones) as BoneName[]) {
      const bone = bones[name];
      const attachment = SKELETON_V1[name];
      bone.container.rotation = 0;
      bone.container.scale.set(1);
      if (attachment.parent === "root") {
        bone.container.position.set(attachment.x, attachment.y);
      } else {
        const parent = bones[attachment.parent];
        const spec = CHARACTER_SHEET_V1.parts[attachment.parent];
        bone.container.position.set(
          (attachment.x - spec.pivot.x) * spec.width,
          (attachment.y - spec.pivot.y) * spec.height,
        );
        parent.container.addChild(bone.container);
        parent.children.push(bone);
      }
    }

    root.addChild(layer);
    // Layer attachment changes draw order, never the Sprite's transform parent.
    for (const name of SKELETON_DRAW_ORDER) layer.attach(bones[name].sprite);
    return { root, layer, bones, destroy };
  } catch (error) {
    destroy();
    if (!layer.destroyed) layer.destroy();
    throw error;
  }
}
