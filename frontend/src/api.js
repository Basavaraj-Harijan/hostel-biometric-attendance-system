const PYTHON_AI_URL = "http://localhost:5000";
const SPRING_BOOT_URL = "http://localhost:8081/api";

export const api = {
  // 1. ವಿದ್ಯಾರ್ಥಿ ಮತ್ತು ಮುಖ ರಿಜಿಸ್ಟ್ರೇಶನ್
  async registerStudent(studentData, imageBase64) {
    const faceRes = await fetch(`${PYTHON_AI_URL}/api/face/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: studentData.id,
        personName: studentData.name,
        imageBase64,
      }),
    });
    if (!faceRes.ok) {
      const err = await faceRes.json();
      throw new Error(err.detail || "Face enrollment failed");
    }

    const dbRes = await fetch(`${SPRING_BOOT_URL}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentData),
    });
    if (!dbRes.ok) throw new Error("Failed to save student to MySQL");
    return dbRes.json();
  },

  // 2. ಕ್ಯಾಮೆರಾ ಮುಖ ಗುರುತಿಸಿ MySQL attendance_records ಗೆ Present ಮಾರ್ಕ್ ಮಾಡುವುದು
  async verifyAndMarkAttendance(imageBase64) {
    // ಹಂತ A: Python (5000) ನಲ್ಲಿ ಮುಖ ಪರಿಶೀಲನೆ
    const verifyRes = await fetch(`${PYTHON_AI_URL}/api/face/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) {
      throw new Error(verifyData.detail || "Face not recognized");
    }

    // ಈಗಾಗಲೇ Spring Boot ಮೂಲಕ ಸೇವ್ ಆಗಿದ್ದರೆ ನೇರವಾಗಿ ಹಿಂತಿರುಗಿಸು
    if (verifyData.attendanceDate && verifyData.punchTime) {
      return verifyData;
    }

    // ಹಂತ B: Spring Boot (8081) -> MySQL attendance_records ನಲ್ಲಿ ಸೇವ್ ಮಾಡುವುದು
    const markRes = await fetch(`${SPRING_BOOT_URL}/biometric/mark-attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId: verifyData.personId,
        personName: verifyData.name || verifyData.personName,
        confidence: verifyData.confidence || 92.5,
      }),
    });

    const markData = await markRes.json();
    if (!markRes.ok) {
      throw new Error(markData.message || "Attendance marking failed");
    }
    return markData;
  },

  // 3. MySQL ನಿಂದ ಇಂದಿನ ಹಾಜರಾತಿ ಲಿಸ್ಟ್ ತರುವುದು
  async getAttendanceRecords() {
    const res = await fetch(`${SPRING_BOOT_URL}/biometric/records`);
    if (!res.ok) return [];
    return res.json();
  },
};