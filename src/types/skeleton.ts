import type { Container, RenderLayer, Sprite } from "pixi.js";
import type { BoneName } from "./character";

export type BoneAttachment = {
  parent: BoneName | "root";
  x: number;
  y: number;
};

export type BoneNode = {
  name: BoneName;
  container: Container;
  sprite: Sprite;
  children: BoneNode[];
};

export type AssembledCharacter = {
  root: Container;
  layer: RenderLayer;
  bones: Record<BoneName, BoneNode>;
  destroy: () => void;
};
