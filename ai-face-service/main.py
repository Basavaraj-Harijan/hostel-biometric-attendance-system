from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import cv2
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

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


class FaceEnrollPayload(BaseModel):
    personId: str
    personName: str
    imageBase64: str


class FaceVerifyPayload(BaseModel):
    imageBase64: str


def decode_and_extract_face(image_base64: str):
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]
    try:
        img_bytes = base64.b64decode(image_base64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image format")

    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode camera image")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80)
    )
    if len(faces) == 0:
        raise HTTPException(
            status_code=400,
            detail="No face detected. Look directly at the camera with good lighting.",
        )

    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    face_roi = cv2.resize(gray[y : y + h, x : x + w], (100, 100))
    return cv2.equalizeHist(face_roi)


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
    face_img = decode_and_extract_face(payload.imageBase64)
    img_path = os.path.join(FACES_DIR, f"{payload.personId}.png")
    meta_path = os.path.join(FACES_DIR, f"{payload.personId}.json")

    cv2.imwrite(img_path, face_img)
    with open(meta_path, "w") as f:
        json.dump(
            {"personId": payload.personId, "personName": payload.personName}, f
        )

    # Spring Boot (8081) ಗೆ ಟೆಂಪ್ಲೇಟ್ ಐಡಿ ಕಳುಹಿಸುವುದು
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
    live_face = decode_and_extract_face(payload.imageBase64)

    best_score = -1.0
    matched_meta = None

    for fname in os.listdir(FACES_DIR):
        if not fname.endswith(".png"):
            continue
        pid = fname.replace(".png", "")
        saved_face = cv2.imread(
            os.path.join(FACES_DIR, fname), cv2.IMREAD_GRAYSCALE
        )
        if saved_face is None:
            continue

        res = cv2.matchTemplate(live_face, saved_face, cv2.TM_CCOEFF_NORMED)
        score = float(res[0][0])
        if score > best_score:
            best_score = score
            meta_file = os.path.join(FACES_DIR, f"{pid}.json")
            if os.path.exists(meta_file):
                with open(meta_file) as f:
                    matched_meta = json.load(f)

    if matched_meta is None or best_score < 0.55:
        raise HTTPException(
            status_code=404,
            detail="Face not recognized. Please register face first.",
        )

    # Spring Boot (8081) ನಲ್ಲಿ ಹಾಜರಾತಿ ದಾಖಲಿಸುವುದು
    try:
        sb_res = requests.post(
            f"{SPRING_BOOT_URL}/verify",
            json={"templateHash": f"FACE_{matched_meta['personId']}"},
            timeout=4,
        )
        if sb_res.status_code == 200:
            return sb_res.json()
        if sb_res.status_code == 409:
            raise HTTPException(
                status_code=409,
                detail=sb_res.json().get("message", "Already marked present today"),
            )
    except HTTPException:
        raise
    except Exception:
        pass

    return {
        "personId": matched_meta["personId"],
        "name": matched_meta["personName"],
        "confidence": round(best_score * 100, 1),
        "status": "Present",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)