# Development Plan

## Goal

固定フォーマットのキャラクターシートから、ブラウザ内でキャラクターを組み立て、ダンスさせ、WebMとして保存できるMVPを完成させる。

---

## Milestone 01 - Project Foundation

### Tasks

- React + TypeScript + Viteセットアップ
- PixiJS導入
- ディレクトリ作成
- 型定義
- Character Sheet Config
- Upload UI
- PNG Validation

### Done

- `npm run build` 成功
- 正常/異常PNGのValidationが動く

---

## Milestone 02 - Character Sheet Parser

### Tasks

- File → ImageBitmap
- 固定座標から10パーツ切り出し
- パーツごとのCanvas生成
- Pixi Texture変換
- ParsedCharacter作成

### Done

- 10パーツを個別表示可能

---

## Milestone 03 - Skeleton Renderer

### Tasks

- Container階層作成
- Pivot設定
- Bone親子関係
- Draw order
- Neutral Pose
- Preview領域への自動フィット

### Done

- Character Sheetから組み立てたキャラクターが1体表示される

---

## Milestone 04 - Animation Player

### Tasks

- Motion JSON読み込み
- Keyframe
- Linear interpolation
- rotation / x / y
- loop
- play / pause / reset

### Done

- サンプルダンスがループ再生される

---

## Milestone 05 - Dance Studio UI

### Tasks

- Dance選択
- 再生
- 一時停止
- リセット
- Speed
- Background
- Responsive UI

### Done

- デスクトップ/スマホで操作可能

---

## Milestone 06 - WebM Export

### Tasks

- `canvas.captureStream()`
- `MediaRecorder`
- 30fps
- 録画開始/停止
- Blob生成
- ダウンロード

### Done

- ダンス動画をWebMでローカル保存可能

---

## Milestone 07 - Polish

### Tasks

- Error UI
- Loading UI
- Template download
- Accessibility
- Sample Character
- README更新

### Done

初見ユーザーが説明なしでも

Upload → Dance → Export

まで到達できる。

---

## MVP Completion Criteria

- AIなし
- Backendなし
- DBなし
- 画像アップロードなし
- 2048×2048 PNG対応
- 10パーツ固定
- 1つ以上のダンス
- WebM保存
- モバイルブラウザで最低限利用可能
