
const BACKEND_URL = "http://localhost:8081/api";
const FACE_AI_URL = "http://localhost:5000";

export const api = {
  // 1. Students (MySQL)
  getStudents: async () => {
    const res = await fetch(`${BACKEND_URL}/students`);
    if (!res.ok) throw new Error("Failed to fetch students from MySQL");
    return res.json();
  },
  saveStudent: async (studentData) => {
    const res = await fetch(`${BACKEND_URL}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentData),
    });
    if (!res.ok) throw new Error("Failed to save student to MySQL");
    return res.json();
  },

  // 2. Employees (MySQL)
  getEmployees: async () => {
    const res = await fetch(`${BACKEND_URL}/employees`);
    if (!res.ok) throw new Error("Failed to fetch employees from MySQL");
    return res.json();
  },
  saveEmployee: async (employeeData) => {
    const res = await fetch(`${BACKEND_URL}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(employeeData),
    });
    if (!res.ok) throw new Error("Failed to save employee to MySQL");
    return res.json();
  },

  // 3. Python Face Enrollment (Port 5000)
  enrollFace: async (personId, personName, imageBase64) => {
    const res = await fetch(`${FACE_AI_URL}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        person_name: personName,
        image: imageBase64,
      }),
    });
    if (!res.ok) throw new Error("Face enrollment failed on Python service");
    return res.json();
  },
};