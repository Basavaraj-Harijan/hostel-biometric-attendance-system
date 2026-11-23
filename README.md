# Hostel Biometric Attendance Management System

Starter project containing:
- React/Vite frontend with a public homepage, demo warden login, dashboard, registration, three attendance methods, billing and reports.
- Java Spring Boot backend starter with REST endpoints and MySQL configuration.
- Python face-service integration scaffold.
- MySQL schema.

## Important hardware note
Face recognition and fingerprint attendance are integration scaffolds, not certified production biometric systems. Face enrollment/recognition requires a compatible camera, a validated model, consent, liveness detection and secure template storage. Fingerprint support requires a compatible scanner and its official SDK/API. Do not use the demo login or localStorage data for real hostel operations.

## Run the frontend
1. Install Node.js 20+.
2. Open a terminal in `frontend`.
3. Run `npm install`
4. Run `npm run dev`
5. Open the local URL printed by Vite.

Demo warden login:
- Username: `warden`
- Password: `hostel123`

The demo login is client-side only. Replace it with backend authentication before deployment.

## Run the Spring Boot backend
1. Install Java 17+ and Maven.
2. Create a MySQL database using `database/schema.sql`.
3. Configure database username/password using environment variables or update `backend/src/main/resources/application.properties`.
4. In `backend`, run `mvn spring-boot:run`.
5. Backend base URL: `http://localhost:8080/api`

## Run the Python face-service scaffold
1. Install Python 3.10+.
2. In `ai-face-service`, create a virtual environment.
3. Install `pip install -r requirements.txt`.
4. Run `uvicorn main:app --reload --port 8001`.

The endpoint intentionally returns `501 Not Implemented` until a real face model, liveness checks, consent workflow and secure template store are configured.

## Suggested next implementation steps
1. Connect frontend forms to Spring Boot APIs.
2. Implement Spring Security authentication and BCrypt password hashing.
3. Add role-based access and audit logs.
4. Implement attendance rules and duplicate prevention on the server.
5. Integrate a supported fingerprint scanner SDK.
6. Select and validate a face recognition model and liveness solution; complete a privacy/security review.
7. Add automated tests, backups, monitoring and deployment configuration.
