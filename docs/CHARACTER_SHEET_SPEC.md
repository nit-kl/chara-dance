# Character Sheet Specification v1

## 目的

AIを使わず、固定座標だけでキャラクターパーツを切り出せる入力フォーマットを定義する。

## 画像仕様

- PNG
- 2048 × 2048 px
- RGBA推奨
- 背景透過推奨
- 最大10MB
- 1シート1キャラクター

## パーツ

- head
- body
- leftUpperArm
- rightUpperArm
- leftLowerArm
- rightLowerArm
- leftUpperLeg
- rightUpperLeg
- leftLowerLeg
- rightLowerLeg

## 固定座標

| Part | x | y | width | height |
|---|---:|---:|---:|---:|
| head | 0 | 0 | 1024 | 512 |
| body | 1024 | 0 | 1024 | 512 |
| leftUpperArm | 0 | 512 | 1024 | 384 |
| rightUpperArm | 1024 | 512 | 1024 | 384 |
| leftLowerArm | 0 | 896 | 1024 | 384 |
| rightLowerArm | 1024 | 896 | 1024 | 384 |
| leftUpperLeg | 0 | 1280 | 1024 | 384 |
| rightUpperLeg | 1024 | 1280 | 1024 | 384 |
| leftLowerLeg | 0 | 1664 | 1024 | 384 |
| rightLowerLeg | 1024 | 1664 | 1024 | 384 |

## Pivot

Pivot値は `src/config/characterSheetV1.ts` に一元管理する。

## Validation

- MIME: `image/png`
- 解像度: 2048×2048
- 最大サイズ: 10MB

## MVP対象外

- AI画像認識
- AI姿勢推定
- 自動リギング
- 自由形式画像
- 3D
- IK
- 物理演算
- 表情
- 口パク
- 指アニメーション

## Definition of Done

- 正しいPNGを読み込める
- 不正ファイルを拒否できる
- 固定10領域を切り出せる
- PixiJS Textureへ変換できる
- Skeletonを組み立てられる
- Neutral Poseを表示できる
- サーバー送信しない
