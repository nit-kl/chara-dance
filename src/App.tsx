import { useEffect, useRef, useState } from "react";
import { CharacterUploader } from "./components/CharacterUploader";
import { PartPreview } from "./components/PartPreview";
import { CharacterPreview } from "./components/CharacterPreview";
import { parseCharacterSheet } from "./character/CharacterSheetParser";
import type { ParsedCharacter } from "./types/character";
import "./styles.css";

export default function App() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [character, setCharacter] = useState<ParsedCharacter | null>(null);
  const selectionId = useRef(0);

  useEffect(() => () => { selectionId.current++; }, []);

  function clearSelection() {
    selectionId.current++;
    setCharacter(null);
    setFileName(null);
  }

  async function loadCharacter(file: File) {
    const currentId = selectionId.current;
    const parsed = await parseCharacterSheet(file);
    if (currentId !== selectionId.current) return;
    setCharacter(parsed);
    setFileName(file.name);
  }

  return (
    <main className="appShell">
      <header className="hero">
        <span className="eyebrow">AIなし / ブラウザ完結</span>
        <h1>CharaDance</h1>
        <p>
          決められたキャラシートをアップロードして、
          低コストで2Dキャラクターを踊らせるWebアプリ。
        </p>
      </header>

      <CharacterUploader
        onValidFile={loadCharacter}
        onSelectionChange={clearSelection}
      />

      <section className="statusCard">
        <strong>MVP Status</strong>
        <p>{fileName ? `読み込み済み: ${fileName}` : "キャラシート未選択"}</p>
        <p>読み込み後、各パーツの画像・サイズ・Pivotを確認できます。</p>
      </section>
      {character && <>
        <CharacterPreview character={character} />
        <PartPreview character={character} />
      </>}
    </main>
  );
}
