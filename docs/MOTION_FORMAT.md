# Motion Format v1

## Example

```json
{
  "id": "cute-dance",
  "name": "Cute Dance",
  "duration": 4,
  "loop": true,
  "tracks": {
    "body": [
      { "time": 0, "rotation": -2, "x": 0, "y": 0 },
      { "time": 0.5, "rotation": 2, "x": 4, "y": -4 }
    ],
    "leftUpperArm": [
      { "time": 0, "rotation": -20 },
      { "time": 0.5, "rotation": 45 }
    ]
  }
}
```

## Rules

- time: 秒
- rotation: degree
- x / y: px
- scaleX / scaleY: optional
- 指定されていない値はNeutral Poseを継承
- キーフレーム間はMVPではLinear interpolation

## Playback semantics (Milestone 04)

- `id` / `name` は空でない文字列、`duration` は有限の正数、`loop` はboolean。
- Track名は既存BoneNameのみ。timeとTransform値は有限数。
- timeは0以上duration以下、各track内で厳密な昇順（同時刻の重複は拒否）。
- x/yはNeutral Poseの接続位置への加算値。rotationはdegree、scaleは絶対倍率。
- 各keyframeで省略された値はrotation/x/y=0、scaleX/scaleY=1。
- 最初のkeyframeが0秒より後なら、0秒のNeutral Poseから補間する。
- 最後のkeyframe以降はその姿勢を保持する。空track・未指定BoneはNeutral Pose。
- loop時はdurationで0秒へ戻る。連続したループには開始・終了姿勢をデータで揃える。
- resetとsetMotionは停止・0秒・Neutral Poseに戻す。playで0秒のMotion姿勢を適用する。
- 非loopの終了後にplayすると先頭から再生する。速度は有限の正数。
