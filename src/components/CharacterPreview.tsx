import { useEffect, useRef, useState } from "react";
import { CharacterRenderer } from "../character/CharacterRenderer";
import type { ParsedCharacter } from "../types/character";

export function CharacterPreview({ character }: { character: ParsedCharacter }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("キャラクターを組み立てています...");

  useEffect(() => {
    let active = true;
    const renderer = new CharacterRenderer(host.current, character);
    setStatus("キャラクターを組み立てています...");
    void renderer.ready.then(() => {
      if (active) setStatus("Neutral Pose · 10パーツ");
    }).catch(() => {
      if (active) setStatus("キャラクターを表示できませんでした。ブラウザの描画機能を確認し、画像を再選択してください。");
    });
    return () => {
      active = false;
      renderer.destroy();
    };
  }, [character]);

  return (
    <section className="characterPreview" aria-labelledby="character-preview-title">
      <h2 id="character-preview-title">Character Preview</h2>
      <p role="status">{status}</p>
      <div className="characterCanvas" ref={host} />
    </section>
  );
}
