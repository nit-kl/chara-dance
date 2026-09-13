# Architecture

## 目的

AIを利用せず、固定フォーマットのキャラクターシートからブラウザ内だけでダンス動画を生成する。

## 全体構成

```text
User PNG
  ↓
CharacterSheetValidator
  ↓
CharacterSheetParser
  ↓
CharacterAssembler
  ↓
PixiJS Renderer
  ↓
AnimationPlayer ← Motion JSON
  ↓
Canvas
  ↓
MediaRecorder / captureStream()
  ↓
WebM
```

## フロントエンド

- React
- TypeScript
- Vite

ReactはUIと状態管理を担当する。

## 描画

PixiJSを利用する。

責務:

- パーツTexture
- Container階層
- Pivot
- Transform
- レイヤー順
- Canvas描画

## Character

`src/character`

- Validator
- Parser
- Assembler
- Renderer

Character Sheetの座標定義は `src/config/characterSheetV1.ts` のみを正とする。

## Animation

`src/animation`

- MotionLoader
- AnimationPlayer
- interpolation

モーションデータはJSON。

キャラクター固有ではなく共通Skeletonを対象とする。

## Export

`src/export`

MVPでは以下のみ。

```text
PixiJS canvas
↓
canvas.captureStream()
↓
MediaRecorder
↓
WebM Blob
```

サーバーサイドレンダリングは行わない。

## Backend

MVPでは存在しない。

以下は導入しない。

- API Server
- Database
- Authentication
- Cloud Storage
- Queue
- GPU Server

## Hosting

静的ホスティングを前提とする。

候補:

- Cloudflare Pages
- GitHub Pages
- Vercel static deployment

特定ベンダーへの依存はコードに持ち込まない。

## Privacy

アップロードされたキャラクター画像はブラウザメモリ上のみで扱う。

以下は禁止。

- fetchによる画像送信
- analyticsへの画像送信
- Storage保存
- Server Actionへの送信

## Future

必要になった場合のみ、

- IndexedDBによるローカル保存
- モーション追加
- Joint Editor
- Character Sheet v2
- MP4変換手段

を検討する。
