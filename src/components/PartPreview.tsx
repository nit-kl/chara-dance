import { useEffect, useRef } from "react";
import type { ParsedCharacter, ParsedPart } from "../types/character";

function PartImage({ part }: { part: ParsedPart }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = part.canvas;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${part.name} の切り出し画像`);
    host.current?.appendChild(canvas);
    return () => { canvas.remove(); };
  }, [part]);

  return <div className="partImage" ref={host} />;
}

export function PartPreview({ character }: { character: ParsedCharacter }) {
  return (
    <section className="partPreview" aria-labelledby="part-preview-title">
      <h2 id="part-preview-title">Part Preview / Debug View</h2>
      <p>10パーツの切り出し結果です。市松模様は透明な部分を表します。</p>
      <div className="partGrid">
        {Object.values(character.parts).map((part) => (
          <article className="partCard" key={part.name}>
            <h3>{part.name}</h3>
            <PartImage part={part} />
            <p>{part.width} × {part.height} px</p>
            <p>Pivot: x {part.pivot.x} / y {part.pivot.y}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
