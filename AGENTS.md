# AGENTS.md

このリポジトリは Codex を利用して段階的に開発する。

## 最重要ルール

- AI推論API・生成AI API・画像認識APIを製品処理に追加しない。
- ユーザー画像をサーバーへアップロードしない。
- MVPではバックエンドを作らない。
- 既存仕様を勝手に拡張しない。
- 仕様変更が必要な場合は、まず `docs/` を更新してからコードを変更する。
- 1回の作業では原則1 Milestoneに集中する。
- 不要な依存ライブラリを追加しない。
- `npm run build` が通る状態で作業を終える。

## アーキテクチャ

React + TypeScript + Vite + PixiJS。

画像処理、アニメーション再生、動画書き出しはブラウザ内で完結させる。

## 実装優先順位

`docs/DEVELOPMENT_PLAN.md` の Milestone 順に実装する。

## MVPで禁止すること

- AIによる画像パーツ判定
- 自動リギング
- 3D化
- ログイン
- DB
- サーバーサイドFFmpeg
- クラウドストレージ
- 課金機能
- MP4出力への過度な最適化

## コーディング方針

- TypeScript strict
- ドメインロジックをReactコンポーネントへ詰め込まない
- 設定値は `src/config` に集約
- 型は `src/types` に集約
- モーションデータはJSONで管理
- Character Sheetの座標をコード内に重複定義しない
