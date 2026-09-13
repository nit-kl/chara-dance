# CharaDance

キャラシートからキャラクターを組み立て、ダンスを再生し、WebM動画を保存する
ブラウザアプリです。Milestone 01〜07のMVPを実装しています。

**AI不要。画像はブラウザ内だけで処理され、サーバーへ送信されません。**
バックエンド・DB・ログイン・解析サービスはありません。サンプルやダンスは
同じサイトから取得する静的ファイルです。ユーザー画像はブラウザのメモリだけで扱います。

## すぐ試す

1. 「サンプルで試す」を押す。
2. Cute DanceをPlay。ダンス、速度、背景を変更できる。
3. 「WebM動画を作成」を押し、完了後「動画を保存」。

サンプルはCute Dance / 1.0x / Darkで準備されます。自動再生はしません。
自分のキャラシートでも同じ操作ができます。

## 起動と確認

React + TypeScript + Vite + PixiJS。Node.js 22.12以上を使用してください。

```bash
npm install
npm run dev
```

```bash
npm run build
npm run lint
npm run preview
```

ビルド成果物は`dist/`です。公開作業は含みません。
ブラウザで実行するテストの手順は[tests/README.md](tests/README.md)にあります。

## Character Sheet

- 2048 × 2048 px / PNG / 最大10MB / 背景透過推奨
- 頭・胴体・左右の上腕／前腕／太もも／すねの固定10パーツ
- [テンプレートPNG](public/templates/character-sheet-v1.png)の指定領域に描く
- 座標とPivotの正は`src/config/characterSheetV1.ts`

画面のアップロード欄からテンプレートを保存できます。
詳細は[Character Sheet仕様](docs/CHARACTER_SHEET_SPEC.md)と
[Skeleton仕様](docs/SKELETON_V1.md)を参照してください。
Advanced / Debugを開くと各パーツとPivotを確認できます。

## Sample Character

[sample-idol.png](public/samples/sample-idol.png)は、ユーザー提供のキャラクター画像を
ローカルで10パーツの固定フォーマットに配置し直したサンプルです。
通常のValidator / Parser / Skeletonを通し、サンプル専用Rendererはありません。
変換元は`tools/source-idol.png`、変換処理は`tools/prepare-idol.ts`です。
開発サーバーの`/tools/prepare-idol.html`から再生成できます。
アプリ実行時にはこのツールを読み込まず、画像の外部送信やAI処理も行いません。
肩・肘の共通接続位置はユーザー承認のもと、人型の比率に調整しています。
以前の長い腕を前提にしたシートは腕の配置調整が必要になる場合があります。

## WebM Export

実際のプレビューCanvasを30fpsで録画します。現在の再生位置や速度に関係なく、
0秒から1.0xで1ループ分作成します。完了・キャンセル後は停止し、元の速度に戻ります。
背景は動画に含まれます。Transparent Checkerは市松模様を記録し、透過動画にはしません。
作成中は画面を開いたままにしてください。タブを隠すと録画を中止します。
詳細は[WebM Export仕様](docs/WEBM_EXPORT.md)を参照してください。

## ブラウザと現在の制約

- Chrome / Edge / Firefox / Safariで、`captureStream`、`MediaRecorder`とWebM MIME対応を
  実行時に確認します。対応しない場合は動画作成を無効化して案内を表示します。
- Chromeで実際のWebM生成・再生を検証しています。その他のブラウザと実機スマホの
  録画互換性は未検証です。ブラウザ名だけで動作を保証しません。
- 録画はリアルタイムです。端末負荷によりフレームや正確な動画長に差が出ます。
- 任意の一枚絵を自動で分解する機能はありません。固定キャラシートが必要です。
- MP4 / GIF / 音声 / 透過動画 / 編集機能 / データの永続保存には対応していません。
- ページを閉じると選択画像と未保存の動画は失われます。

対応判定は[MediaRecorder.isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static)
と[canvas.captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream)を使用します。

## 今後の候補

実機での互換性確認、サンプルやモーションの追加、キャラシート制作ガイドの充実。
機能追加は別のスコープで検討します。

開発前に[AGENTS.md](AGENTS.md)、[Architecture](docs/ARCHITECTURE.md)、
[Development Plan](docs/DEVELOPMENT_PLAN.md)を確認してください。
ユーザー導線は[USER_FLOW.md](docs/USER_FLOW.md)に記載しています。
