import { useRef } from "react";
import { useDanceStudio } from "../hooks/useDanceStudio";
import { MOTIONS } from "../config/motions";
import { BACKGROUNDS } from "../config/backgrounds";
import { ANIMATION_PREVIEW } from "../config/animationPreview";
import type { ParsedCharacter } from "../types/character";
import type { CharacterSheetState } from "../types/studio";
import { EXPORT_CONFIG, EXPORT_UNSUPPORTED } from "../config/export";

type Props = {
  character: ParsedCharacter | null;
  sheet: CharacterSheetState;
  onChooseFile: () => void;
  onExportLockChange: (locked: boolean) => void;
  onSample: () => void;
};

export function CharacterPreview({ character, sheet, onChooseFile, onSample, onExportLockChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const studio = useDanceStudio(character, host, onExportLockChange);
  const fileLoading = sheet.phase === "fetching" || sheet.phase === "validating" || sheet.phase === "parsing";
  const loading = fileLoading || studio.loading;
  const error = sheet.error ?? studio.error;
  const time = (seconds: number) => seconds.toFixed(2).padStart(5, "0");
  const status = loading ? (fileLoading ? (sheet.phase === "fetching" ? "サンプルを読み込んでいます…" : sheet.phase === "validating" ? "画像を確認しています…" : "キャラクターを準備しています…") : studio.loadingMessage)
    : studio.playbackState?.isPlaying ? "再生中" : character ? "準備完了" : "キャラクター未選択";

  return (
    <>
    <ol className="onboarding" aria-label="動画を作る3ステップ">
      {["キャラクターを選ぶ", "ダンスを選ぶ", "動画を作る"].map((label, index) => {
        const step = !character ? 0 : studio.locked || studio.exportState.url ? 2 : 1;
        return <li key={label} aria-current={index === step ? "step" : undefined}><span>{index + 1}</span>{label}</li>;
      })}
    </ol>
    <div id="studio" className="studioLayout">
      <section className="characterPreview" aria-labelledby="character-preview-title">
        <div className="previewHeader"><h2 id="character-preview-title">キャラクター</h2><span className="stateBadge" role="status">{error ? "確認が必要です" : status}</span></div>
        <div className="previewStage">
          <div className={studio.background.checker ? "characterCanvas checker" : "characterCanvas"} ref={host}
            style={{ backgroundColor: studio.background.checker ? undefined : "#" + studio.background.color.toString(16).padStart(6, "0") }} />
          {!character && !loading && !error && (
            <div className="emptyState">
              <span className="emptyMark" aria-hidden="true">✳</span>
              <h3>あなたのキャラクターを<br />踊らせよう</h3>
              <p>AI不要。画像はブラウザの外へ送信されません。<br />キャラシートがなくても、すぐに試せます。</p>
              <button className="primaryButton" data-sample onClick={onSample}>サンプルで試す</button>
              <button className="secondaryButton" onClick={onChooseFile}>自分のキャラシートをアップロード</button>
            </div>
          )}
          {loading && <div className="stageNotice" role="status"><span className="loadingDot" />{status}</div>}
        </div>
        {error && <div className="previewError" role="alert"><p>{error}</p>
          {sheet.error && <button className="secondaryButton" data-sample onClick={onSample}>サンプルで試す</button>}
          {sheet.error || !studio.retryMotion
            ? <button className="secondaryButton" onClick={onChooseFile}>PNGを選び直す</button>
            : <button className="secondaryButton" onClick={studio.retryMotion}>再試行</button>}
        </div>}
        <div className="previewFooter"><span>あなたのキャラクター、あなたのステージ。</span><span>2D · Local</span></div>
      </section>
      <aside className="animationControls" aria-label="ダンスの設定">
        <div className="controlSection">
          <label className="controlLabel" htmlFor="dance-select"><span>01</span> ダンス</label>
          <select id="dance-select" disabled={studio.locked} value={studio.selectedMotion.id} onChange={(event) => studio.selectMotion(event.target.value)}>
            {MOTIONS.map((motion) => <option key={motion.id} value={motion.id}>{motion.name}</option>)}
          </select>
          <p className="controlHint">ダンスを選んで、Playで再生。</p>
        </div>
        <div className="controlSection">
          <h2 className="controlLabel"><span>02</span> 再生</h2>
          <div className="playbackButtons">
            <button className="primaryButton" disabled={studio.locked || !studio.ready || studio.playbackState?.isPlaying} onClick={studio.play}>Play</button>
            <button disabled={studio.locked || !studio.ready || !studio.playbackState?.isPlaying} onClick={studio.pause}>Pause</button>
            <button disabled={studio.locked || !studio.ready} onClick={studio.reset}>Reset</button>
          </div>
          <div className="timeRow"><span>{studio.playbackState?.isPlaying ? "再生中" : "停止中"}</span>
            <output aria-label="再生時間" aria-live="off">{time(studio.playbackState?.currentTime ?? 0)} / {time(studio.playbackState?.duration ?? 0)}</output>
          </div>
        </div>
        <fieldset className="controlSection" disabled={studio.locked}>
          <legend className="controlLabel"><span>03</span> 速度</legend>
          <div className="speedOptions">
            {ANIMATION_PREVIEW.speeds.map((speed) => <button key={speed} data-speed={speed} aria-pressed={studio.speed === speed}
              onClick={() => studio.selectSpeed(speed)}>{speed.toFixed(1)}x</button>)}
          </div>
        </fieldset>
        <fieldset className="controlSection" disabled={studio.locked}>
          <legend className="controlLabel"><span>04</span> 背景</legend>
          <div className="backgroundOptions">
            {BACKGROUNDS.map((background) => <button key={background.id} data-background={background.id}
              aria-pressed={studio.background.id === background.id} onClick={() => studio.selectBackground(background.id)}>
              <span aria-hidden="true" className={background.checker ? "swatch checker" : "swatch"}
                style={{ backgroundColor: background.checker ? undefined : "#" + background.color.toString(16).padStart(6, "0") }} />
              {background.name}
            </button>)}
          </div>
        </fieldset>
        <div className="controlSection exportControls">
          <h2 className="controlLabel"><span>05</span> 動画を作る</h2>
          <p className="controlHint">WebM / {EXPORT_CONFIG.fps} FPS · 1ループ・1.0x</p>
          {!studio.exportSupported && <p role="status" className="message error">{EXPORT_UNSUPPORTED}</p>}
          {studio.exportState.error && <p role="alert" className="message error">{studio.exportState.error}</p>}
          {studio.locked ? <>
            <p role="status">動画を作成しています…</p>
            <p className="exportProgress">{studio.exportState.currentTime.toFixed(1)} / {studio.exportState.duration.toFixed(1)} 秒</p>
            <button onClick={studio.cancelExport}>キャンセル</button>
          </> : <>
            {studio.exportState.url && <>
              <p className="exportSuccess" role="status"><span aria-hidden="true">✓</span> 動画ができました</p>
              <a className="downloadButton" href={studio.exportState.url} download={studio.exportState.filename}>動画を保存</a>
            </>}
            <button className="primaryButton" disabled={!studio.ready || !studio.exportSupported} onClick={studio.createVideo}>
              {studio.exportState.url ? "もう一度作る" : "WebM動画を作成"}
            </button>
          </>}
          <p className="controlHint">作成中はこの画面を開いたままにしてください。市松模様の背景も動画に含まれます。</p>
        </div>
      </aside>
    </div>
    </>
  );
}
