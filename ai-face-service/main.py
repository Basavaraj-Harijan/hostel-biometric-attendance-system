from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Hostel Face Recognition Service", version="0.1.0")

class VerifyRequest(BaseModel):
    person_type: str
    person_id: int
    camera_id: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "face-recognition-scaffold",
            "recognition_configured": False}

@app.post("/enroll")
def enroll():
    raise HTTPException(
        status_code=501,
        detail="Not implemented: configure consent capture, a validated face model, encrypted template storage and deletion workflow."
    )

@app.post("/verify")
def verify(payload: VerifyRequest):
    raise HTTPException(
        status_code=501,
        detail="Not implemented: connect a camera, validated recognition model and liveness detection before enabling attendance."
    )
