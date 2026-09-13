# CharaDance

固定フォーマットのキャラクターシートをアップロードすると、AIを使わずにブラウザ内で2Dボーンアニメーションを生成するWebアプリのスターターです。

## 方針

- AI / 画像認識APIを使わない
- 画像をサーバーへ送信しない
- 可能な限りブラウザ内で完結
- 低コスト運用
- MVPでは固定キャラシート + 固定スケルトン + JSONモーション
- 最初の動画出力は WebM を想定

## 技術

- React
- TypeScript
- Vite
- PixiJS
- Canvas / WebGL
- MediaRecorder API

## 起動

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## 開発の進め方

1. `docs/CHARACTER_SHEET_SPEC.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DEVELOPMENT_PLAN.md`
4. `AGENTS.md`

を先に読んでください。

Codexには `AGENTS.md` の指示を守らせ、`docs/DEVELOPMENT_PLAN.md` の Milestone 順に実装させることを推奨します。

## 現在の実装

初期版では以下を含みます。

- PNGアップロード
- 2048×2048 / PNG / 10MB以下のバリデーション
- 10パーツの固定領域定義
- 開発用キャラシートテンプレート
- モーションJSONの型
- 最小UI

本格的なPixiJSスケルトン描画・ダンス再生・動画出力は Milestone 02以降で実装します。
