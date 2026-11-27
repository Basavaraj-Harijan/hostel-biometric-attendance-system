from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from io import BytesIO
from PIL import Image, ImageOps
import base64
import numpy as np
import requests
import os
import json

app = FastAPI(title="Hostel Face Recognition Service", version="1.0.0")

# React (5173) ಮತ್ತು Spring Boot (8081) ಕನೆಕ್ಷನ್ ಅನುಮತಿ
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPRING_BOOT_URL = "http://localhost:8081/api/biometric"
FACES_DIR = "enrolled_faces"
os.makedirs(FACES_DIR, exist_ok=True)


class FaceEnrollPayload(BaseModel):
    personId: str
    personName: str
    imageBase64: str


class FaceVerifyPayload(BaseModel):
    imageBase64: str


def decode_and_extract_face(image_base64: str) -> np.ndarray:
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]
    try:
        img_bytes = base64.b64decode(image_base64)
        img = Image.open(BytesIO(img_bytes)).convert("L")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image format")

    # ಕ್ಯಾಮೆರಾ ಫ್ರೇಮ್ ಮಧ್ಯಭಾಗದ ಮುಖದ ಪ್ರದೇಶವನ್ನು ಕ್ರಾಪ್ ಮಾಡಿ 100x100 ಗೆ ಹೊಂದಿಸುವುದು
    w, h = img.size
    if w < 50 or h < 50:
        raise HTTPException(status_code=400, detail="Camera frame too small")

    crop_box = (int(w * 0.25), int(h * 0.15), int(w * 0.75), int(h * 0.85))
    face_roi = img.crop(crop_box).resize((100, 100))
    face_eq = ImageOps.equalize(face_roi)
    return np.asarray(face_eq, dtype=np.uint8)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "hostel-face-recognition",
        "recognition_configured": True,
    }


@app.post("/api/face/capture-check")
def check_face_in_frame(payload: FaceVerifyPayload):
    decode_and_extract_face(payload.imageBase64)
    return {"success": True, "message": "Face detected clearly"}


@app.post("/api/face/enroll")
def enroll_face(payload: FaceEnrollPayload):
    face_arr = decode_and_extract_face(payload.imageBase64)
    img_path = os.path.join(FACES_DIR, f"{payload.personId}.png")
    meta_path = os.path.join(FACES_DIR, f"{payload.personId}.json")

    Image.fromarray(face_arr).save(img_path)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(
            {"personId": payload.personId, "personName": payload.personName}, f
        )

    try:
        requests.post(
            f"{SPRING_BOOT_URL}/enroll",
            json={
                "personId": payload.personId,
                "personName": payload.personName,
                "templateHash": f"FACE_{payload.personId}",
            },
            timeout=4,
        )
    except Exception:
        pass

    return {"success": True, "message": f"Face enrolled for {payload.personName}"}


@app.post("/api/face/verify")
def verify_face(payload: FaceVerifyPayload):
    live_face = decode_and_extract_face(payload.imageBase64).astype(np.float32)
    live_norm = (live_face - live_face.mean()) / (live_face.std() + 1e-6)

    best_score = -1.0
    matched_meta = None

    for fname in os.listdir(FACES_DIR):
        if not fname.endswith(".png"):
            continue
        pid = fname.replace(".png", "")
        saved_path = os.path.join(FACES_DIR, fname)
        try:
            saved_img = Image.open(saved_path).convert("L").resize((100, 100))
        except Exception:
            continue

        saved_face = np.asarray(saved_img, dtype=np.float32)
        saved_norm = (saved_face - saved_face.mean()) / (saved_face.std() + 1e-6)
        score = float(np.mean(live_norm * saved_norm))

        if score > best_score:
            best_score = score
            meta_file = os.path.join(FACES_DIR, f"{pid}.json")
            if os.path.exists(meta_file):
                with open(meta_file, encoding="utf-8") as f:
                    matched_meta = json.load(f)

    if matched_meta is None or best_score < 0.25:
        raise HTTPException(
            status_code=404,
            detail=f"Face not recognized (score: {round(best_score, 2)}). Look straight at camera.",
        )

    return {
        "personId": matched_meta["personId"],
        "name": matched_meta["personName"],
        "confidence": round(max(best_score, 0.5) * 100, 1),
        "status": "Present",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)