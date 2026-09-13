import type { RefObject } from "react";
import type { CharacterSheetState } from "../types/studio";

type Props = {
  inputRef: RefObject<HTMLInputElement | null>;
  sheet: CharacterSheetState;
  onChooseFile: () => void;
  onFile: (file: File) => Promise<void>;
  disabled?: boolean;
  onSample: () => void;
};

export function CharacterUploader({ inputRef, sheet, onChooseFile, onFile, onSample, disabled }: Props) {
  const loading = sheet.phase === "fetching" || sheet.phase === "validating" || sheet.phase === "parsing";
  const message = sheet.error ?? (sheet.phase === "validating" ? "画像を確認しています…"
    : sheet.phase === "fetching" ? "サンプルを読み込んでいます…" : sheet.phase === "parsing" ? "キャラクターを準備しています…" : sheet.parsedCharacter ? "キャラクターを読み込みました。" : "2048 × 2048 px のPNG・10MB以下");
  return (
    <section className="uploadCard" aria-labelledby="upload-title" aria-busy={loading}>
      <div>
        <p className="eyebrow">CHARACTER SHEET</p>
        <h2 id="upload-title">{sheet.parsedCharacter ? "キャラクターを変更" : "キャラクターをアップロード"}</h2>
        <p className="statusCard">{sheet.selectedFile?.name ?? "固定フォーマットのキャラシートを選択してください。"}</p>
        <p role={sheet.error ? "alert" : "status"} className={sheet.error ? "message error" : "message"}>{message}</p>
      </div>
      <div className="uploadActions">
        <button className="secondaryButton" disabled={disabled} onClick={onChooseFile}>{sheet.parsedCharacter ? "PNGを変更" : "PNGを選択"}</button>
        <button data-sample disabled={disabled || loading} onClick={onSample}>サンプルで試す</button>
        <label className="srOnly" htmlFor="character-file">キャラクターシートPNG</label>
        <input id="character-file" ref={inputRef} type="file" accept="image/png" hidden disabled={disabled} onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void onFile(file);
        }} />
      </div>
    </section>
  );
}
