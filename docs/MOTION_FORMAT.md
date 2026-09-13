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
