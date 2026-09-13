import { useRef, useState } from "react";
import { validateCharacterSheet } from "../character/validateCharacterSheet";

type Props = {
  onValidFile: (file: File) => Promise<void>;
  onSelectionChange: () => void;
};

export function CharacterUploader({ onValidFile, onSelectionChange }: Props) {
  const validationId = useRef(0);
  const [message, setMessage] = useState<string>("2048×2048pxのPNGを選択してください。");
  const [isError, setIsError] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const currentId = ++validationId.current;
    event.target.value = "";
    onSelectionChange();

    setMessage("確認中...");
    setIsError(false);

    const result = await validateCharacterSheet(file);
    if (currentId !== validationId.current) return;

    if (!result.ok) {
      setMessage(result.message);
      setIsError(true);
      return;
    }

    setMessage("パーツを切り出しています...");
    try {
      await onValidFile(file);
      if (currentId !== validationId.current) return;
      setMessage("10パーツを読み込みました。");
    } catch {
      if (currentId !== validationId.current) return;
      setMessage("パーツを切り出せませんでした。画像を確認して、もう一度選択してください。");
      setIsError(true);
    }
  }

  return (
    <section className="uploadCard">
      <h2>Character Sheet</h2>
      <p>固定フォーマットのPNGをアップロードします。画像はサーバーへ送信されません。</p>

      <label className="uploadButton">
        PNGを選択
        <input type="file" accept="image/png" onChange={handleChange} hidden />
      </label>

      <p role="status" className={isError ? "message error" : "message"}>{message}</p>

      <a href="/templates/character-sheet-v1.png" download>
        テンプレートPNGをダウンロード
      </a>
    </section>
  );
}
