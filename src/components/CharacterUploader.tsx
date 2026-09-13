import { useState } from "react";
import { validateCharacterSheet } from "../character/validateCharacterSheet";

type Props = {
  onValidFile: (file: File) => void;
};

export function CharacterUploader({ onValidFile }: Props) {
  const [message, setMessage] = useState<string>("2048×2048pxのPNGを選択してください。");
  const [isError, setIsError] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("確認中...");
    setIsError(false);

    const result = await validateCharacterSheet(file);

    if (!result.ok) {
      setMessage(result.message);
      setIsError(true);
      return;
    }

    setMessage("キャラシートを読み込みました。");
    onValidFile(file);
  }

  return (
    <section className="uploadCard">
      <h2>Character Sheet</h2>
      <p>固定フォーマットのPNGをアップロードします。画像はサーバーへ送信されません。</p>

      <label className="uploadButton">
        PNGを選択
        <input type="file" accept="image/png" onChange={handleChange} hidden />
      </label>

      <p className={isError ? "message error" : "message"}>{message}</p>

      <a href="/templates/character-sheet-v1.png" download>
        テンプレートPNGをダウンロード
      </a>
    </section>
  );
}
