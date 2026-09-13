import { useCallback, useRef, useState } from "react";
import { CharacterUploader } from "./components/CharacterUploader";
import { PartPreview } from "./components/PartPreview";
import { CharacterPreview } from "./components/CharacterPreview";
import { useCharacterSheet } from "./hooks/useCharacterSheet";
import "./styles.css";

export default function App() {
  const sheet = useCharacterSheet();
  const input = useRef<HTMLInputElement>(null);
  const lockRef = useRef(false);
  const [locked, setLocked] = useState(false);
  const onExportLockChange = useCallback((value: boolean) => { lockRef.current = value; setLocked(value); }, []);
  const chooseFile = () => { if (!lockRef.current) input.current?.click(); };
  const selectFile = async (file: File) => { if (!lockRef.current) await sheet.selectFile(file); };
  const selectSample = () => { if (!lockRef.current) void sheet.selectSample(); };

  return (
    <main className="appShell">
      <header className="appHeader">
        <a className="wordmark" href="#studio">CharaDance<span className="brandDot" /></a>
        <span className="privacyNote">画像はブラウザ内だけで処理されます。<br />サーバーへアップロードされません。</span>
      </header>
      <div className="studioHeading">
        <div><p className="eyebrow">YOUR CHARACTER, IN MOTION</p><h1>Dance Studio</h1></div>
        <p>キャラクターに、動きを。<br />ダンスと背景を選んで、あなただけのステージへ。</p>
      </div>
      <CharacterPreview key={sheet.sampleVersion} character={sheet.parsedCharacter} sheet={sheet} onChooseFile={chooseFile} onSample={selectSample} onExportLockChange={onExportLockChange} />
      <CharacterUploader inputRef={input} sheet={sheet} onChooseFile={chooseFile} onFile={selectFile} onSample={selectSample} disabled={locked} />
      <section className="templateCard" aria-labelledby="template-title">
        <div><h2 id="template-title">自分のキャラクターを使いたい？</h2>
          <p>2048 × 2048 px のPNG。指定領域に身体パーツを配置してください。背景透過を推奨します。</p></div>
        <a className="templateDownload" href={`${import.meta.env.BASE_URL}templates/character-sheet-v1.png`} download="character-sheet-v1.png">テンプレートPNGをダウンロード</a>
      </section>
      {sheet.parsedCharacter && (
        <details className="debugPanel">
          <summary>Advanced / Debug <span>パーツの切り出しを確認</span></summary>
          <PartPreview character={sheet.parsedCharacter} />
        </details>
      )}
    </main>
  );
}
