import { useState } from "react";
import { CharacterUploader } from "./components/CharacterUploader";
import "./styles.css";

export default function App() {
  const [fileName, setFileName] = useState<string | null>(null);

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

      <CharacterUploader onValidFile={(file) => setFileName(file.name)} />

      <section className="statusCard">
        <strong>MVP Status</strong>
        <p>{fileName ? `読み込み済み: ${fileName}` : "キャラシート未選択"}</p>
        <p>次のMilestoneで、10パーツへの分解とPixiJS表示を実装します。</p>
      </section>
    </main>
  );
}
