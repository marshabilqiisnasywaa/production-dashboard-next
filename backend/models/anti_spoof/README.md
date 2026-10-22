# Anti-spoofing models

Silent-Face-Anti-Spoofing MiniFASNet weights in ONNX format, used by `app/services/face/antispoof.py`.

- Upstream project: https://github.com/minivision-ai/Silent-Face-Anti-Spoofing (Apache-2.0)
- ONNX conversion: https://github.com/yakhyo/face-anti-spoofing (Apache-2.0), release tag `weights`
- Input: 1x3x80x80 float32, BGR, values 0-255, face crop expanded by 2.7 (V2) and 4.0 (V1SE)
- Output: 3 logits, class 1 is "real". The two models' softmax outputs are averaged.

| File | SHA-256 |
| --- | --- |
| MiniFASNetV2.onnx | b32929adc2d9c34b9486f8c4c7bc97c1b69bc0ea9befefc380e4faae4e463907 |
| MiniFASNetV1SE.onnx | ebab7f90c7833fbccd46d3a555410e78d969db5438e169b6524be444862b3676 |

Download again:

```powershell
curl.exe -L -o MiniFASNetV2.onnx https://github.com/yakhyo/face-anti-spoofing/releases/download/weights/MiniFASNetV2.onnx
curl.exe -L -o MiniFASNetV1SE.onnx https://github.com/yakhyo/face-anti-spoofing/releases/download/weights/MiniFASNetV1SE.onnx
Get-FileHash *.onnx -Algorithm SHA256
```

Without these files the backend does not start while `FACE_ANTISPOOF_ENABLED` is true.
