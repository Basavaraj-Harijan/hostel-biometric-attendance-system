import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { api } from "./api";

function HostelCareApp() {
  const [role, setRole] = useState("WARDEN"); // "WARDEN" ಅಥವಾ "STUDENT"
  const [activeTab, setActiveTab] = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [defaulters, setDefaulters] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Registration State
  const [regForm, setRegForm] = useState({
    id: `STU${Math.floor(100000 + Math.random() * 900000)}`,
    name: "",
    course: "B.E CSE",
    room: "",
    phone: "",
  });
  const [capturedImg, setCapturedImg] = useState(null);
  const [regMessage, setRegMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  // Live Attendance State
  const [scanMessage, setScanMessage] = useState({ text: "", type: "" });
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // MySQL ನಿಂದ ಎಲ್ಲಾ ಡೇಟಾ ಸಿಂಕ್ ಮಾಡುವುದು
  const syncMySQLData = async () => {
    try {
      const [stuData, attData, defData] = await Promise.all([
        fetch("http://localhost:8081/api/students").then((r) => (r.ok ? r.json() : [])),
        fetch("http://localhost:8081/api/biometric/records").then((r) => (r.ok ? r.json() : [])),
        fetch("http://localhost:8081/api/biometric/defaulters").then((r) => (r.ok ? r.json() : [])),
      ]);
      setStudents(Array.isArray(stuData) ? stuData : []);
      setAttendance(Array.isArray(attData) ? [...attData].reverse() : []);
      setDefaulters(Array.isArray(defData) ? defData : []);
    } catch (err) {
      console.error("MySQL Sync Error:", err);
    }
  };

  useEffect(() => {
    syncMySQLData();
    return () => stopCamera();
  }, []);

  // Camera Controls
  const startCamera = async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      alert("Camera permission denied! Please allow camera access.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const getFrameBase64 = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL("image/jpeg");
  };

  // 1. Capture Face for Registration
  const handleCaptureFace = async () => {
    const img = getFrameBase64();
    if (!img) return;
    setRegMessage({ text: "Checking face clarity...", type: "info" });
    try {
      const res = await fetch("http://localhost:5000/api/face/capture-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: img }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Face not clear");
      setCapturedImg(img);
      setRegMessage({ text: "✅ Face captured clearly! Now click Save.", type: "success" });
    } catch (err) {
      setRegMessage({ text: `⚠️ ${err.message}`, type: "error" });
    }
  };

  // 2. Save Student & Face
  const handleSaveRegistration = async (e) => {
    e.preventDefault();
    if (!regForm.name || !regForm.room) {
      return setRegMessage({ text: "⚠️ Enter Student Name and Room Number", type: "error" });
    }
    if (!capturedImg) {
      return setRegMessage({ text: "⚠️ Please capture face first!", type: "error" });
    }
    setLoading(true);
    setRegMessage({ text: "Saving to MySQL & Face AI...", type: "info" });
    try {
      await api.registerStudent(regForm, capturedImg);
      setRegMessage({ text: `✅ ${regForm.name} (${regForm.id}) registered in MySQL!`, type: "success" });
      setRegForm({
        id: `STU${Math.floor(100000 + Math.random() * 900000)}`,
        name: "",
        course: "B.E CSE",
        room: "",
        phone: "",
      });
      setCapturedImg(null);
      stopCamera();
      await syncMySQLData();
    } catch (err) {
      setRegMessage({ text: `❌ ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 3. Live Face Scan -> Mark Attendance in MySQL
  const handleScanAttendance = async () => {
    const img = getFrameBase64();
    if (!img) return setScanMessage({ text: "⚠️ Please open camera first!", type: "error" });
    setLoading(true);
    setScanMessage({ text: "🔍 Verifying biometric face...", type: "info" });
    try {
      const saved = await api.verifyAndMarkAttendance(img);
      setScanMessage({
        text: `✅ ${saved.personName} (${saved.personId}) — ${saved.status} at ${saved.punchTime}`,
        type: saved.status === "Late Entry" ? "warning" : "success",
      });
      await syncMySQLData();
    } catch (err) {
      setScanMessage({ text: `⚠️ ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 4. Export CSV Report
  const exportAttendanceCSV = () => {
    if (attendance.length === 0) return alert("No attendance records available to export!");
    const csvRows = [
      "Record ID,Student ID,Student Name,Date,Punch Time,Status,Confidence %",
      ...attendance.map(
        (r) => `${r.id},${r.personId},"${r.personName}",${r.attendanceDate},${r.punchTime},${r.status},${r.confidence}`
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `HOSTELCARE_Attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const switchTab = (tab) => {
    stopCamera();
    setScanMessage({ text: "", type: "" });
    setRegMessage({ text: "", type: "" });
    setActiveTab(tab);
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const presentTodayCount = attendance.filter((a) => a.attendanceDate === todayStr).length;
  const lateEntriesCount = attendance.filter((a) => a.status === "Late Entry").length;

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.room?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={ui.appWrapper}>
      {/* LEFT SIDEBAR — HOSTELCARE ORIGINAL DARK THEME */}
      <aside style={ui.sidebar}>
        <div style={ui.brandHeader}>
          <div style={ui.brandIcon}>H</div>
          <div>
            <div style={ui.brandName}>HOSTELCARE</div>
            <div style={ui.brandTag}>Biometric Attendance v2.0</div>
          </div>
        </div>

        <div style={ui.menuSectionLabel}>MAIN NAVIGATION</div>
        <nav style={ui.navMenu}>
          {[
            { id: "dashboard", icon: "📊", label: "Dashboard Overview" },
            { id: "attendance", icon: "📸", label: "Live Face Attendance" },
            ...(role === "WARDEN"
              ? [
                  { id: "registration", icon: "👤", label: "Biometric Registration" },
                  { id: "directory", icon: "🏠", label: "Hostel Directory" },
                  { id: "reports", icon: "📑", label: "Reports & Defaulters" },
                ]
              : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => switchTab(item.id)}
              style={{
                ...ui.navItem,
                ...(activeTab === item.id ? ui.navItemActive : {}),
              }}
            >
              <span style={{ marginRight: "10px" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* System Health Status */}
        <div style={ui.systemBox}>
          <div style={ui.sysRow}>
            <span style={ui.dotGreen}></span> MySQL Database (8081)
          </div>
          <div style={ui.sysRow}>
            <span style={ui.dotGreen}></span> Face AI Engine (5000)
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
            Curfew Alert: After 09:30 PM
          </div>
        </div>
      </aside>

      {/* RIGHT CONTENT AREA */}
      <div style={ui.mainContainer}>
        {/* TOP HEADER BAR */}
        <header style={ui.topBar}>
          <div>
            <h1 style={ui.pageTitle}>
              {activeTab === "dashboard" && "Warden Command Dashboard"}
              {activeTab === "attendance" && "Live Biometric Face Terminal"}
              {activeTab === "registration" && "New Student Face Enrollment"}
              {activeTab === "directory" && "Registered Hostel Residents"}
              {activeTab === "reports" && "Attendance Analytics & Defaulters"}
            </h1>
            <span style={ui.pageSubtitle}>Real-Time Face Recognition & Automated Curfew Tracking</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Role Switcher (Warden vs Student) */}
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                switchTab("dashboard");
              }}
              style={ui.roleSelect}
            >
              <option value="WARDEN">🛡️ Role: Warden (Admin)</option>
              <option value="STUDENT">🎓 Role: Student View</option>
            </select>
            <button onClick={syncMySQLData} style={ui.refreshBtn}>
              ↻ Sync
            </button>
          </div>
        </header>

        {/* PAGE BODY */}
        <main style={ui.body}>
          {/* 1. DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
              <div style={ui.kpiGrid}>
                <div style={ui.kpiCard}>
                  <div style={ui.kpiLabel}>Total Registered</div>
                  <div style={ui.kpiNumber}>{students.length}</div>
                  <div style={ui.kpiFoot}>Active Hostel Residents</div>
                </div>
                <div style={ui.kpiCard}>
                  <div style={ui.kpiLabel}>Present Today</div>
                  <div style={{ ...ui.kpiNumber, color: "#10b981" }}>{presentTodayCount}</div>
                  <div style={ui.kpiFoot}>Verified via Face AI</div>
                </div>
                <div style={ui.kpiCard}>
                  <div style={ui.kpiLabel}>Late Entries (&gt;9:30 PM)</div>
                  <div style={{ ...ui.kpiNumber, color: "#f59e0b" }}>{lateEntriesCount}</div>
                  <div style={ui.kpiFoot}>Curfew Violations</div>
                </div>
                <div style={ui.kpiCard}>
                  <div style={ui.kpiLabel}>Defaulters (&lt;75%)</div>
                  <div style={{ ...ui.kpiNumber, color: "#ef4444" }}>{defaulters.length}</div>
                  <div style={ui.kpiFoot}>Requires Warden Notice</div>
                </div>
              </div>

              <div style={ui.card}>
                <div style={ui.cardHeader}>
                  <h3 style={{ margin: 0 }}>Recent Attendance Activity</h3>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={exportAttendanceCSV} style={ui.outlineBtn}>
                      ⬇ Export CSV
                    </button>
                    <button onClick={() => switchTab("attendance")} style={ui.primaryBtn}>
                      + Open Face Scanner
                    </button>
                  </div>
                </div>
                <table style={ui.table}>
                  <thead>
                    <tr>
                      <th style={ui.th}>Student ID</th>
                      <th style={ui.th}>Name</th>
                      <th style={ui.th}>Date</th>
                      <th style={ui.th}>Punch Time</th>
                      <th style={ui.th}>Match %</th>
                      <th style={ui.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                          No attendance punches recorded yet. Click "Open Face Scanner" to mark attendance.
                        </td>
                      </tr>
                    ) : (
                      attendance.slice(0, 10).map((r) => (
                        <tr key={r.id}>
                          <td style={ui.td}><strong>{r.personId}</strong></td>
                          <td style={ui.td}>{r.personName}</td>
                          <td style={ui.td}>{r.attendanceDate}</td>
                          <td style={ui.td}>{r.punchTime}</td>
                          <td style={ui.td}>{r.confidence}%</td>
                          <td style={ui.td}>
                            <span style={r.status === "Late Entry" ? ui.badgeLate : ui.badgePresent}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* 2. LIVE FACE ATTENDANCE */}
          {activeTab === "attendance" && (
            <div style={ui.twoColumn}>
              <div style={ui.card}>
                <h3 style={{ marginTop: 0 }}>Biometric Camera Feed</h3>
                <div style={ui.cameraFrame}>
                  <video ref={videoRef} autoPlay playsInline style={ui.video} />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "14px" }}>
                  <button onClick={startCamera} style={ui.darkBtn}>
                    📷 Open Camera
                  </button>
                  <button
                    onClick={handleScanAttendance}
                    disabled={!cameraActive || loading}
                    style={ui.successBtn}
                  >
                    {loading ? "Verifying Face..." : "✅ Scan & Mark Present"}
                  </button>
                </div>
                {scanMessage.text && (
                  <div style={getAlertStyle(scanMessage.type)}>{scanMessage.text}</div>
                )}
              </div>

              <div style={ui.card}>
                <div style={ui.cardHeader}>
                  <h3 style={{ margin: 0 }}>Live MySQL Attendance Log</h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Auto-blocks duplicate punches</span>
                </div>
                <table style={ui.table}>
                  <thead>
                    <tr>
                      <th style={ui.th}>ID</th>
                      <th style={ui.th}>Name</th>
                      <th style={ui.th}>Time</th>
                      <th style={ui.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((r) => (
                      <tr key={r.id}>
                        <td style={ui.td}>{r.personId}</td>
                        <td style={ui.td}>{r.personName}</td>
                        <td style={ui.td}>{r.punchTime}</td>
                        <td style={ui.td}>
                          <span style={r.status === "Late Entry" ? ui.badgeLate : ui.badgePresent}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. REGISTRATION */}
          {activeTab === "registration" && (
            <div style={ui.twoColumn}>
              <div style={ui.card}>
                <h3 style={{ marginTop: 0 }}>Resident Details</h3>
                <form onSubmit={handleSaveRegistration} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={ui.label}>Auto-Generated Student ID</label>
                  <input value={regForm.id} readOnly style={{ ...ui.input, backgroundColor: "#f1f5f9" }} />

                  <label style={ui.label}>Full Name *</label>
                  <input
                    placeholder="Enter student full name"
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    style={ui.input}
                  />

                  <label style={ui.label}>Department / Course</label>
                  <input
                    placeholder="e.g. B.E CSE"
                    value={regForm.course}
                    onChange={(e) => setRegForm({ ...regForm, course: e.target.value })}
                    style={ui.input}
                  />

                  <label style={ui.label}>Hostel Room Number *</label>
                  <input
                    placeholder="e.g. Block-A 104"
                    value={regForm.room}
                    onChange={(e) => setRegForm({ ...regForm, room: e.target.value })}
                    style={ui.input}
                  />

                  <label style={ui.label}>Mobile Number</label>
                  <input
                    placeholder="e.g. 9876543210"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    style={ui.input}
                  />

                  <button type="submit" disabled={loading} style={ui.successBtn}>
                    {loading ? "Saving to Database..." : "💾 Register Student & Biometric"}
                  </button>
                </form>
                {regMessage.text && <div style={getAlertStyle(regMessage.type)}>{regMessage.text}</div>}
              </div>

              <div style={ui.card}>
                <h3 style={{ marginTop: 0 }}>Face Template Capture</h3>
                <div style={ui.cameraFrame}>
                  <video ref={videoRef} autoPlay playsInline style={ui.video} />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "14px" }}>
                  <button type="button" onClick={startCamera} style={ui.darkBtn}>
                    📷 Open Camera
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureFace}
                    disabled={!cameraActive}
                    style={ui.primaryBtn}
                  >
                    🎯 Capture Face
                  </button>
                </div>
                {capturedImg && (
                  <div style={{ marginTop: "14px" }}>
                    <small style={{ color: "#10b981", fontWeight: "bold" }}>Captured Face Preview:</small>
                    <img
                      src={capturedImg}
                      alt="Captured"
                      style={{ width: "120px", borderRadius: "8px", display: "block", marginTop: "6px", border: "2px solid #10b981" }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. HOSTEL DIRECTORY */}
          {activeTab === "directory" && (
            <div style={ui.card}>
              <div style={ui.cardHeader}>
                <h3 style={{ margin: 0 }}>Registered Students ({filteredStudents.length})</h3>
                <input
                  placeholder="🔍 Search by Name, ID or Room..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...ui.input, width: "260px" }}
                />
              </div>
              <table style={ui.table}>
                <thead>
                  <tr>
                    <th style={ui.th}>Student ID</th>
                    <th style={ui.th}>Name</th>
                    <th style={ui.th}>Course</th>
                    <th style={ui.th}>Room</th>
                    <th style={ui.th}>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s.id}>
                      <td style={ui.td}><strong>{s.id}</strong></td>
                      <td style={ui.td}>{s.name}</td>
                      <td style={ui.td}>{s.course}</td>
                      <td style={ui.td}>{s.room}</td>
                      <td style={ui.td}>{s.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. REPORTS & DEFAULTERS */}
          {activeTab === "reports" && (
            <div style={ui.card}>
              <div style={ui.cardHeader}>
                <div>
                  <h3 style={{ margin: 0, color: "#ef4444" }}>Defaulter Alert List (&lt;75% Attendance)</h3>
                  <small style={{ color: "#64748b" }}>Calculated automatically from MySQL attendance_records</small>
                </div>
                <button onClick={exportAttendanceCSV} style={ui.primaryBtn}>
                  ⬇ Download Monthly CSV Report
                </button>
              </div>
              <table style={ui.table}>
                <thead>
                  <tr>
                    <th style={ui.th}>Student ID</th>
                    <th style={ui.th}>Name</th>
                    <th style={ui.th}>Room No</th>
                    <th style={ui.th}>Attendance %</th>
                    <th style={ui.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {defaulters.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#10b981" }}>
                        All students have above 75% attendance!
                      </td>
                    </tr>
                  ) : (
                    defaulters.map((d) => (
                      <tr key={d.id} style={{ backgroundColor: "#fef2f2" }}>
                        <td style={ui.td}><strong>{d.id}</strong></td>
                        <td style={ui.td}>{d.name}</td>
                        <td style={ui.td}>{d.room}</td>
                        <td style={{ ...ui.td, color: "#dc2626", fontWeight: "bold" }}>{d.percentage}%</td>
                        <td style={ui.td}>
                          <span style={ui.badgeLate}>Low Attendance</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const getAlertStyle = (type) => ({
  marginTop: "14px",
  padding: "12px",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "14px",
  backgroundColor: type === "success" ? "#dcfce7" : type === "warning" ? "#fef3c7" : type === "info" ? "#e0f2fe" : "#fee2e2",
  color: type === "success" ? "#166534" : type === "warning" ? "#92400e" : type === "info" ? "#075985" : "#991b1b",
});

const ui = {
  appWrapper: { display: "flex", minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", backgroundColor: "#f1f5f9", color: "#0f172a" },
  sidebar: { width: "260px", backgroundColor: "#0f172a", color: "#f8fafc", display: "flex", flexDirection: "column", padding: "22px 18px" },
  brandHeader: { display: "flex", alignItems: "center", gap: "12px", paddingBottom: "20px", borderBottom: "1px solid #1e293b" },
  brandIcon: { width: "42px", height: "42px", borderRadius: "10px", background: "linear-gradient(135deg, #2563eb, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "20px", color: "#fff" },
  brandName: { fontWeight: "700", fontSize: "17px", letterSpacing: "0.6px" },
  brandTag: { fontSize: "11px", color: "#94a3b8" },
  menuSectionLabel: { fontSize: "11px", fontWeight: "700", color: "#64748b", marginTop: "22px", marginBottom: "10px", letterSpacing: "0.8px" },
  navMenu: { display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
  navItem: { display: "flex", alignItems: "center", padding: "11px 14px", borderRadius: "8px", border: "none", backgroundColor: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: "14px", fontWeight: "500", textAlign: "left", transition: "0.2s" },
  navItemActive: { backgroundColor: "#2563eb", color: "#ffffff", fontWeight: "600" },
  systemBox: { backgroundColor: "#1e293b", padding: "14px", borderRadius: "10px", fontSize: "12px", color: "#cbd5e1" },
  sysRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" },
  dotGreen: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" },
  mainContainer: { flex: 1, display: "flex", flexDirection: "column" },
  topBar: { backgroundColor: "#ffffff", padding: "18px 30px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" },
  pageTitle: { margin: 0, fontSize: "20px", fontWeight: "700" },
  pageSubtitle: { fontSize: "13px", color: "#64748b" },
  roleSelect: { padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontWeight: "600", backgroundColor: "#f8fafc", cursor: "pointer" },
  refreshBtn: { padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff", cursor: "pointer", fontWeight: "600" },
  body: { padding: "26px 30px", display: "flex", flexDirection: "column", gap: "22px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px" },
  kpiCard: { backgroundColor: "#ffffff", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  kpiLabel: { fontSize: "13px", color: "#64748b", fontWeight: "600" },
  kpiNumber: { fontSize: "30px", fontWeight: "800", margin: "6px 0" },
  kpiFoot: { fontSize: "12px", color: "#94a3b8" },
  card: { backgroundColor: "#ffffff", padding: "22px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  twoColumn: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" },
  cameraFrame: { backgroundColor: "#0f172a", borderRadius: "10px", overflow: "hidden", minHeight: "270px", display: "flex", alignItems: "center", justifyContent: "center" },
  video: { width: "100%", display: "block" },
  label: { fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "-6px" },
  input: { padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" },
  primaryBtn: { backgroundColor: "#2563eb", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  successBtn: { backgroundColor: "#10b981", color: "#fff", border: "none", padding: "11px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  darkBtn: { backgroundColor: "#0f172a", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  outlineBtn: { backgroundColor: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  th: { textAlign: "left", padding: "11px 12px", borderBottom: "2px solid #e2e8f0", color: "#475569", fontSize: "13px" },
  td: { padding: "11px 12px", borderBottom: "1px solid #f1f5f9" },
  badgePresent: { backgroundColor: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" },
  badgeLate: { backgroundColor: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HostelCareApp />
  </React.StrictMode>
);