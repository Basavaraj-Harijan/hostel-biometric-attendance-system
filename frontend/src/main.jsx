import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Home, Users, UserRound, Fingerprint, ScanFace, ClipboardCheck,
  Receipt, FileText, Settings, LogOut, Menu, Search, Plus,
  Printer, ShieldCheck, IndianRupee, CalendarDays, Activity, X
} from 'lucide-react';
import './styles.css';

const initialStudents = [
  { id: 'STU001', name: 'Aarav Patil', course: 'B.E. CSE', room: '101', phone: '9876543210', status: 'Active', biometric: true },
  { id: 'STU002', name: 'Sneha Kulkarni', course: 'BCA', room: '102', phone: '9876543211', status: 'Active', biometric: true },
  { id: 'STU003', name: 'Rahul Desai', course: 'B.E. ECE', room: '103', phone: '9876543212', status: 'Active', biometric: true }
];

const initialEmployees = [
  { id: 'EMP001', name: 'Ramesh Kumar', role: 'Warden Assistant', phone: '9876500001', status: 'Active', biometric: true },
  { id: 'EMP002', name: 'Savita Patil', role: 'Cook', phone: '9876500002', status: 'Active', biometric: true }
];

const today = new Date().toISOString().slice(0, 10);

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [page, setPage] = useState('landing');
  const [logged, setLogged] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [students, setStudents] = useState(() => read('students', initialStudents));
  const [employees, setEmployees] = useState(() => read('employees', initialEmployees));
  const [attendance, setAttendance] = useState(() => read('attendance', []));
  const [bills, setBills] = useState(() => read('bills', []));
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [billForm, setBillForm] = useState({
    studentId: '', month: new Date().toISOString().slice(0, 7),
    rent: 5000, mess: 2500, electricity: 300, other: 0, paid: 0
  });
  const [manualDate, setManualDate] = useState(today);
  const [activeTab, setActiveTab] = useState('students');

  // Single USB Fingerprint Scanner States
  const [scannerStatus, setScannerStatus] = useState({ connected: false, message: 'Not checked' });
  const [capturedTemplate, setCapturedTemplate] = useState('');
  const [scanning, setScanning] = useState(false);

  const persist = (key, val, setter) => {
    setter(val);
    localStorage.setItem(key, JSON.stringify(val));
  };

  const notify = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3200);
  };

  const goHome = () => {
    setPage('landing');
    setMobile(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function checkScanner() {
    try {
      const res = await fetch('http://localhost:5000/api/scanner/status');
      const data = await res.json();
      setScannerStatus(data);
      notify(data.message);
    } catch {
      setScannerStatus({ connected: false, message: 'Python Biometric Service offline' });
      notify('Python service offline on port 5000.');
    }
  }

  async function captureForRegistration() {
    setScanning(true);
    notify('Place finger on the USB scanner...');
    try {
      const res = await fetch('http://localhost:5000/api/scanner/capture', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Capture failed');
      setCapturedTemplate(data.templateHash);
      notify(`Fingerprint captured (Quality: ${data.quality}%)`);
    } catch (err) {
      notify(err.message);
    } finally {
      setScanning(false);
    }
  }

  async function enrollTemplateToBackend(personId, personName) {
    if (!capturedTemplate) return;
    try {
      await fetch('http://localhost:8081/api/biometric/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId, personName, templateHash: capturedTemplate }),
      });
    } catch {
      notify('Saved locally, but Spring Boot backend (8081) is offline.');
    } finally {
      setCapturedTemplate('');
    }
  }

  async function scanFingerprintAttendance() {
    setScanning(true);
    notify('Place finger on USB scanner to mark attendance...');
    try {
      const res = await fetch('http://localhost:5000/api/scanner/verify-attendance', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Verification failed');

      const row = {
        personId: data.personId,
        name: data.name,
        date: data.attendanceDate || today,
        time: data.attendanceTime || new Date().toLocaleTimeString(),
        method: 'Fingerprint',
        status: 'Present',
      };
      persist('attendance', [row, ...attendance], setAttendance);
      notify(`Marked Present: ${data.name} (${data.personId})`);
    } catch (err) {
      notify(err.message);
    } finally {
      setScanning(false);
    }
  }

  const nav = [
    ['Home', 'dashboard', Home],
    ['Registration', 'registration', Users],
    ['Attendance', 'attendance', ClipboardCheck],
    ['Bill Details', 'billing', Receipt],
    ['Reports', 'reports', FileText],
    ['Settings', 'settings', Settings]
  ];

  function login(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('username') === 'warden' && f.get('password') === 'hostel123') {
      setLogged(true);
      setPage('dashboard');
      notify('Welcome, Warden!');
    } else {
      notify('Invalid demo credentials.');
    }
  }

  function logout() {
    setLogged(false);
    setPage('landing');
  }

  async function addStudent(e) {
    e.preventDefault();
    if (!capturedTemplate) {
      notify('⚠️ ಮೊದಲು Fingerprint ಕ್ಯಾಪ್ಚರ್ ಮಾಡಿ! (Capture Fingerprint first before saving)');
      return;
    }

    const form = e.currentTarget;
    const f = new FormData(form);
    const name = String(f.get('name') || '').trim();
    const course = String(f.get('course') || '').trim();
    const room = String(f.get('room') || '').trim();
    const phone = String(f.get('phone') || '').trim();
    if (!name) return;

    const row = {
      id: 'STU' + String(Date.now()).slice(-6),
      name, course, room, phone,
      status: 'Active',
      biometric: true
    };
    persist('students', [row, ...students], setStudents);
    form.reset();
    notify('Student & Fingerprint registered successfully!');
    await enrollTemplateToBackend(row.id, row.name);
  }

  async function addEmployee(e) {
    e.preventDefault();
    if (!capturedTemplate) {
      notify('⚠️ ಮೊದಲು Fingerprint ಕ್ಯಾಪ್ಚರ್ ಮಾಡಿ! (Capture Fingerprint first before saving)');
      return;
    }

    const form = e.currentTarget;
    const f = new FormData(form);
    const name = String(f.get('name') || '').trim();
    const role = String(f.get('role') || '').trim();
    const phone = String(f.get('phone') || '').trim();
    if (!name) return;

    const row = {
      id: 'EMP' + String(Date.now()).slice(-6),
      name, role, phone,
      status: 'Active',
      biometric: true
    };
    persist('employees', [row, ...employees], setEmployees);
    form.reset();
    notify('Employee & Fingerprint registered successfully!');
    await enrollTemplateToBackend(row.id, row.name);
  }

  function mark(id, type, status = 'Present') {
    if (attendance.some(a => a.personId === id && a.date === manualDate)) {
      notify('Attendance already exists for this person and date.');
      return;
    }
    const person = [...students, ...employees].find(p => p.id === id);
    const row = {
      personId: id,
      name: person?.name || id,
      date: manualDate,
      time: new Date().toLocaleTimeString(),
      method: type,
      status
    };
    persist('attendance', [row, ...attendance], setAttendance);
    notify(`${type} attendance recorded.`);
  }

  function createBill(e) {
    e.preventDefault();
    const student = students.find(s => s.id === billForm.studentId);
    if (!student) {
      notify('Select a student first.');
      return;
    }
    const total = Number(billForm.rent) + Number(billForm.mess) + Number(billForm.electricity) + Number(billForm.other);
    const row = {
      ...billForm,
      id: 'BILL' + String(Date.now()).slice(-6),
      studentName: student.name,
      total,
      balance: Math.max(0, total - Number(billForm.paid)),
      status: Number(billForm.paid) >= total ? 'Paid' : Number(billForm.paid) > 0 ? 'Partial' : 'Unpaid'
    };
    persist('bills', [row, ...bills], setBills);
    notify('Bill generated.');
  }

  const presentToday = attendance.filter(a => a.date === today && a.status === 'Present').length;
  const filteredStudents = students.filter(s => (s.name + s.id + s.room).toLowerCase().includes(query.toLowerCase()));
  const filteredEmployees = employees.filter(s => (s.name + s.id + s.role).toLowerCase().includes(query.toLowerCase()));
  const totalBilled = bills.reduce((n, b) => n + b.total, 0);
  const pageTitle = nav.find(n => n[1] === page)?.[0] || 'Dashboard';

  function landing() {
    return (
      <div className="landing">
        <header className="public-nav">
          <div className="brand" onClick={goHome} style={{ cursor: 'pointer' }}>
            <span className="brand-icon"><Fingerprint /></span>
            <span>HOSTEL<span className="brand-light">CARE</span></span>
          </div>
          <nav>
            <a href="#about">About</a>
            <a href="#features">Features</a>
            <a href="#contact">Contact</a>
          </nav>
          <button className="btn btn-primary" onClick={() => setPage(logged ? 'dashboard' : 'login')}>
            {logged ? 'Go to Dashboard' : 'Hostel Login'} <span>→</span>
          </button>
        </header>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><ShieldCheck size={15} /> SMART HOSTEL MANAGEMENT</div>
            <h1>Smarter hostel life.<br /><em>Simpler management.</em></h1>
            <p>One secure platform to manage student records, staff, single-scanner fingerprint attendance, hostel bills and reports — all in one place.</p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-large" onClick={() => setPage(logged ? 'dashboard' : 'login')}>
                {logged ? 'Open Warden Dashboard' : 'Click here to Hostel Login'} <span>→</span>
              </button>
              <a href="#features" className="text-link">Explore features ↓</a>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={16} /> Secure access</span>
              <span><Activity size={16} /> USB Biometric mandatory</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-orbit orbit-one"></div>
            <div className="art-orbit orbit-two"></div>
            <div className="face-card">
              <div className="face-top"><span>BIOMETRIC VERIFICATION</span><span className="live-dot">● READY</span></div>
              <div className="face-scan">
                <div className="avatar">👆</div>
                <div className="scan-corner tl"></div><div className="scan-corner tr"></div>
                <div className="scan-corner bl"></div><div className="scan-corner br"></div>
                <div className="scan-line"></div>
              </div>
              <div className="face-bottom">
                <div><b>Fingerprint scanner</b><small>1:N instant attendance</small></div>
                <span className="checkmark">✓</span>
              </div>
            </div>
            <div className="floating-chip chip-a"><Fingerprint size={18} /> Single USB Scanner</div>
            <div className="floating-chip chip-b"><ClipboardCheck size={18} /> Instant MySQL Sync</div>
          </div>
        </section>
        <section className="feature-strip" id="features">
          <div><Fingerprint /><b>Fingerprint</b><small>Mandatory enrollment</small></div>
          <div><ScanFace /><b>Face recognition</b><small>AI service scaffold</small></div>
          <div><ClipboardCheck /><b>Attendance</b><small>Daily records</small></div>
          <div><Receipt /><b>Billing</b><small>Clear statements</small></div>
        </section>
        <section className="about-section" id="about">
          <div className="section-kicker">ONE CONNECTED WORKSPACE</div>
          <h2>Everything your hostel needs,<br />in one simple system.</h2>
          <p>Help wardens spend less time on paperwork and more time supporting residents.</p>
        </section>
        <footer id="contact">
          <div className="brand" onClick={goHome} style={{ cursor: 'pointer' }}><span className="brand-icon"><Fingerprint /></span> HOSTELCARE</div>
          <span>Hostel Biometric Attendance Management System</span>
          <span>© 2026 HostelCare</span>
        </footer>
      </div>
    );
  }

  function loginPage() {
    return (
      <div className="login-wrap">
        <button className="back-link" onClick={goHome}>← Back to home</button>
        <div className="login-card">
          <div className="login-symbol" onClick={goHome} style={{ cursor: 'pointer' }}><Fingerprint size={30} /></div>
          <div className="section-kicker">WARDEN PORTAL</div>
          <h2>Welcome back</h2>
          <p>Sign in to manage your hostel.</p>
          <form onSubmit={login}>
            <label>Username<input name="username" placeholder="Enter username" required /></label>
            <label>Password<input name="password" type="password" placeholder="Enter password" required /></label>
            <button className="btn btn-primary full">Login to dashboard →</button>
          </form>
          <div className="demo-hint"><b>Demo access</b><span>Username: warden</span><span>Password: hostel123</span></div>
        </div>
      </div>
    );
  }

  function sidebar() {
    return (
      <aside className={`sidebar ${mobile ? 'show' : ''}`}>
        <div className="side-brand">
          <div onClick={goHome} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <span className="brand-icon"><Fingerprint /></span>
            <div><b>HOSTELCARE</b><small>WARDEN PORTAL</small></div>
          </div>
          <button className="icon-btn mobile-close" onClick={() => setMobile(false)}><X /></button>
        </div>
        <div className="side-label">WORKSPACE</div>
        {nav.map(([label, key, Icon]) => (
          <button key={key} className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => { setPage(key); setMobile(false); }}>
            <Icon size={18} /><span>{label}</span>{page === key && <i />}
          </button>
        ))}
        <div className="side-bottom">
          <div className="warden-mini">
            <div className="warden-avatar">W</div>
            <div><b>Hostel Warden</b><small>Administrator</small></div>
          </div>
          <button className="nav-item logout" onClick={logout}><LogOut size={18} />Logout</button>
        </div>
      </aside>
    );
  }

  function topbar() {
    return (
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={() => setMobile(true)}><Menu /></button>
        <div>
          <div className="crumb">WORKSPACE / <b>{pageTitle.toUpperCase()}</b></div>
          <h2>{pageTitle}</h2>
        </div>
        <div className="top-actions">
          <span className="today-pill"><CalendarDays size={15} />{new Date().toLocaleDateString()}</span>
          <div className="top-avatar">W</div>
        </div>
      </header>
    );
  }

  function stat(label, value, sub, Icon) {
    return (
      <div className="stat-card">
        <div className="stat-top"><span>{label}</span><i><Icon size={19} /></i></div>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    );
  }

  function dashboard() {
    return (
      <>
        <div className="welcome-row">
          <div><h3>Good day, Warden 👋</h3><p>Here is your hostel overview for today.</p></div>
          <span className="date-label"><CalendarDays size={16} />{new Date().toDateString()}</span>
        </div>
        <div className="stats-grid">
          {stat('Total students', students.length, 'Registered residents', Users)}
          {stat('Total employees', employees.length, 'Active staff', UserRound)}
          {stat('Present today', presentToday, 'Recorded attendance', ClipboardCheck)}
          {stat('Bills generated', bills.length, 'Total ₹' + totalBilled.toLocaleString('en-IN'), IndianRupee)}
        </div>
        <div className="content-grid">
          <section className="panel">
            <div className="panel-head">
              <div><h3>Attendance overview</h3><p>Latest attendance entries</p></div>
              <button className="subtle-btn" onClick={() => setPage('attendance')}>View all →</button>
            </div>
            {attendance.length ? (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>PERSON</th><th>DATE</th><th>TIME</th><th>METHOD</th><th>STATUS</th></tr></thead>
                  <tbody>
                    {attendance.slice(0, 5).map((a, i) => (
                      <tr key={i}>
                        <td><b>{a.name}</b><small>{a.personId}</small></td>
                        <td>{a.date}</td><td>{a.time}</td><td>{a.method}</td>
                        <td><span className="status present">{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <ClipboardCheck size={30} /><b>No attendance entries yet</b><span>Start by marking attendance for today.</span>
                <button className="btn btn-primary" onClick={() => setPage('attendance')}>Mark attendance</button>
              </div>
            )}
          </section>
          <section className="panel quick-panel">
            <div className="panel-head"><div><h3>Quick actions</h3><p>Common tasks</p></div></div>
            <button onClick={() => setPage('registration')}><span className="quick-icon blue"><Plus /></span><span><b>Register a student</b><small>Enroll details & fingerprint</small></span><span>→</span></button>
            <button onClick={() => setPage('attendance')}><span className="quick-icon green"><Fingerprint /></span><span><b>Fingerprint attendance</b><small>Scan using USB scanner</small></span><span>→</span></button>
            <button onClick={() => setPage('billing')}><span className="quick-icon orange"><Receipt /></span><span><b>Generate a bill</b><small>Create a student bill</small></span><span>→</span></button>
            <button onClick={() => setPage('reports')}><span className="quick-icon purple"><FileText /></span><span><b>View reports</b><small>Monthly insights</small></span><span>→</span></button>
          </section>
        </div>
      </>
    );
  }

  function registration() {
    return (
      <>
        <div className="tabs">
          <button className={activeTab === 'students' ? 'selected' : ''} onClick={() => { setActiveTab('students'); setCapturedTemplate(''); }}>Student Registration</button>
          <button className={activeTab === 'employees' ? 'selected' : ''} onClick={() => { setActiveTab('employees'); setCapturedTemplate(''); }}>Employee Registration</button>
        </div>
        <div className="content-grid form-layout">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>{activeTab === 'students' ? 'Register student' : 'Register employee'}</h3>
                <p>Biometric fingerprint capture is mandatory before saving.</p>
              </div>
            </div>
            {activeTab === 'students' ? (
              <form key="student-form" className="form-grid" onSubmit={addStudent}>
                <label>Student name<input name="name" type="text" required placeholder="Full name" /></label>
                <label>Course / department<input name="course" type="text" required placeholder="e.g. B.E. CSE" /></label>
                <label>Room number<input name="room" type="text" required placeholder="e.g. 104" /></label>
                <label>Mobile number<input name="phone" type="tel" required pattern="[0-9]{10}" placeholder="10-digit number" /></label>
                <div className="full-span note-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <span>{capturedTemplate ? '✅ Fingerprint template captured' : '⚠️ Capture fingerprint required'}</span>
                  <button type="button" className="btn btn-outline" disabled={scanning} onClick={captureForRegistration}>
                    <Fingerprint size={16} /> {scanning ? 'Scanning...' : 'Capture Fingerprint'}
                  </button>
                </div>
                <button type="submit" className="btn btn-primary full-span"><Plus size={16} /> Save student</button>
              </form>
            ) : (
              <form key="employee-form" className="form-grid" onSubmit={addEmployee}>
                <label>Employee name<input name="name" type="text" required placeholder="Full name" /></label>
                <label>Designation<input name="role" type="text" required placeholder="e.g. Warden assistant" /></label>
                <label>Mobile number<input name="phone" type="tel" required pattern="[0-9]{10}" placeholder="10-digit number" /></label>
                <div className="full-span note-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <span>{capturedTemplate ? '✅ Fingerprint template captured' : '⚠️ Capture fingerprint required'}</span>
                  <button type="button" className="btn btn-outline" disabled={scanning} onClick={captureForRegistration}>
                    <Fingerprint size={16} /> {scanning ? 'Scanning...' : 'Capture Fingerprint'}
                  </button>
                </div>
                <button type="submit" className="btn btn-primary full-span"><Plus size={16} /> Save employee</button>
              </form>
            )}
          </section>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>{activeTab === 'students' ? 'Registered students' : 'Registered employees'}</h3>
                <p>{activeTab === 'students' ? students.length : employees.length} records</p>
              </div>
            </div>
            <div className="search-box"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search records..." /></div>
            <div className="record-list">
              {(activeTab === 'students' ? filteredStudents : filteredEmployees).map(p => (
                <div className="record" key={p.id}>
                  <div className="record-avatar">{p.name[0]}</div>
                  <div>
                    <b>{p.name}</b>
                    <small>{p.id} · {activeTab === 'students' ? `Room ${p.room}` : p.role} {p.biometric ? '· 👆 Enrolled' : ''}</small>
                  </div>
                  <span className="status present">{p.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </>
    );
  }

  function attendancePage() {
    return (
      <>
        <div className="welcome-row">
          <div><h3>Attendance management</h3><p>Use your single USB fingerprint scanner or record attendance manually.</p></div>
          <input className="date-input" type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} />
        </div>
        <div className="method-grid">
          <div className="method-card">
            <div className="method-icon blue"><Fingerprint /></div>
            <h3>Fingerprint attendance</h3>
            <p>Single USB scanner connected via Python bridge (port 5000) & Spring Boot (8081).</p>
            <span className={`status ${scannerStatus.connected ? 'present' : 'warning'}`}>{scannerStatus.message}</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              <button className="btn btn-outline" onClick={checkScanner}>Check device</button>
              <button className="btn btn-primary" disabled={scanning} onClick={scanFingerprintAttendance}>
                {scanning ? 'Place Finger...' : 'Scan & Mark Present'}
              </button>
            </div>
          </div>
          <div className="method-card">
            <div className="method-icon purple"><ScanFace /></div>
            <h3>AI face recognition</h3>
            <p>Use a camera, enrolled face templates and liveness checks to verify identity.</p>
            <span className="status warning">Camera & model optional</span>
            <button className="btn btn-outline" onClick={() => notify('Face recognition requires camera and model configuration in main.py.')}>Open face service</button>
          </div>
          <div className="method-card">
            <div className="method-icon green"><ClipboardCheck /></div>
            <h3>Manual attendance</h3>
            <p>Select a student or employee and record Present attendance directly.</p>
            <span className="status present">Fallback active</span>
            <div className="manual-actions">
              {[...students, ...employees].map(p => (
                <div className="manual-row" key={p.id}>
                  <span><b>{p.name}</b><small>{p.id}</small></span>
                  <button className="mini-btn" onClick={() => mark(p.id, 'Manual', 'Present')}>Present</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <section className="panel">
          <div className="panel-head"><div><h3>Attendance records</h3><p>Saved entries for selected date</p></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>NAME</th><th>ID</th><th>DATE</th><th>TIME</th><th>METHOD</th><th>STATUS</th></tr></thead>
              <tbody>
                {attendance.filter(a => a.date === manualDate).map((a, i) => (
                  <tr key={i}>
                    <td>{a.name}</td><td>{a.personId}</td><td>{a.date}</td><td>{a.time}</td><td>{a.method}</td>
                    <td><span className="status present">{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!attendance.some(a => a.date === manualDate) && <div className="empty compact">No records for this date.</div>}
          </div>
        </section>
      </>
    );
  }

  function billing() {
    return (
      <>
        <div className="content-grid form-layout">
          <section className="panel">
            <div className="panel-head"><div><h3>Generate general bill</h3><p>Create a hostel bill for a registered student.</p></div></div>
            <form className="form-grid" onSubmit={createBill}>
              <label className="full-span">Student
                <select required value={billForm.studentId} onChange={e => setBillForm({ ...billForm, studentId: e.target.value })}>
                  <option value="">Select student</option>
                  {students.map(s => <option value={s.id} key={s.id}>{s.name} ({s.id})</option>)}
                </select>
              </label>
              <label>Billing month<input type="month" value={billForm.month} onChange={e => setBillForm({ ...billForm, month: e.target.value })} /></label>
              {[['rent', 'Hostel rent'], ['mess', 'Mess charges'], ['electricity', 'Electricity'], ['other', 'Other charges'], ['paid', 'Paid amount']].map(([k, l]) => (
                <label key={k}>{l} (₹)<input type="number" min="0" value={billForm[k]} onChange={e => setBillForm({ ...billForm, [k]: e.target.value })} /></label>
              ))}
              <div className="full-span total-preview">
                <span>Estimated total</span>
                <b>₹{(['rent', 'mess', 'electricity', 'other'].reduce((n, k) => n + Number(billForm[k] || 0), 0)).toLocaleString('en-IN')}</b>
              </div>
              <button className="btn btn-primary full-span">Generate bill</button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-head"><div><h3>Bill summary</h3><p>{bills.length} bills generated</p></div></div>
            <div className="bill-summary">
              <small>Total billed</small><strong>₹{totalBilled.toLocaleString('en-IN')}</strong>
              <small>Outstanding balance</small><strong>₹{bills.reduce((n, b) => n + b.balance, 0).toLocaleString('en-IN')}</strong>
            </div>
          </section>
        </div>
        <section className="panel">
          <div className="panel-head"><div><h3>Bill records</h3><p>Generated hostel bills</p></div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>BILL NO.</th><th>STUDENT</th><th>MONTH</th><th>TOTAL</th><th>BALANCE</th><th>STATUS</th><th>ACTION</th></tr></thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.id}>
                    <td>{b.id}</td><td>{b.studentName}</td><td>{b.month}</td><td>₹{b.total}</td><td>₹{b.balance}</td>
                    <td><span className={`status ${b.status === 'Paid' ? 'present' : 'warning'}`}>{b.status}</span></td>
                    <td><button className="mini-btn" onClick={() => window.print()}><Printer size={14} /> Print</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bills.length && <div className="empty compact">No bills generated yet.</div>}
          </div>
        </section>
      </>
    );
  }

  function reports() {
    const month = new Date().toISOString().slice(0, 7);
    const monthRows = attendance.filter(a => a.date.startsWith(month));
    const pct = monthRows.length ? Math.round(monthRows.filter(a => a.status === 'Present').length / monthRows.length * 100) : 0;
    return (
      <>
        <div className="stats-grid">
          {stat('Attendance entries', attendance.length, 'All saved records', ClipboardCheck)}
          {stat('This month', monthRows.length, 'Attendance records', CalendarDays)}
          {stat('Present rate', pct + '%', 'Based on recorded entries', Activity)}
          {stat('Bills outstanding', '₹' + bills.reduce((n, b) => n + b.balance, 0).toLocaleString('en-IN'), 'Pending balance', IndianRupee)}
        </div>
        <section className="panel">
          <div className="panel-head">
            <div><h3>Monthly attendance report</h3><p>Current month: {month}</p></div>
            <button className="btn btn-outline" onClick={() => window.print()}><Printer size={15} /> Print report</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>PERSON</th><th>ID</th><th>DATE</th><th>TIME</th><th>METHOD</th><th>STATUS</th></tr></thead>
              <tbody>
                {monthRows.map((a, i) => (
                  <tr key={i}><td>{a.name}</td><td>{a.personId}</td><td>{a.date}</td><td>{a.time}</td><td>{a.method}</td><td>{a.status}</td></tr>
                ))}
              </tbody>
            </table>
            {!monthRows.length && <div className="empty compact">No attendance data for this month yet.</div>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h3>Financial report</h3><p>Bill collection overview</p></div></div>
          <div className="report-bars">
            <div><span>Total billed</span><b>₹{totalBilled.toLocaleString('en-IN')}</b><div className="bar"><i style={{ width: '100%' }} /></div></div>
            <div><span>Collected</span><b>₹{bills.reduce((n, b) => n + Number(b.paid), 0).toLocaleString('en-IN')}</b><div className="bar"><i style={{ width: (totalBilled ? bills.reduce((n, b) => n + Number(b.paid), 0) / totalBilled * 100 : 0) + '%' }} /></div></div>
          </div>
        </section>
      </>
    );
  }

  function settings() {
    return (
      <section className="panel settings-panel">
        <div className="panel-head"><div><h3>System settings</h3><p>Hardware & backend service connection status.</p></div></div>
        <div className="setting-row">
          <div><b>Python Biometric Bridge</b><small>http://localhost:5000 (USB RD Service connector)</small></div>
          <span className={`status ${scannerStatus.connected ? 'present' : 'warning'}`}>{scannerStatus.message}</span>
        </div>
        <div className="setting-row">
          <div><b>Spring Boot REST API</b><small>http://localhost:8081/api/biometric (MySQL persistence)</small></div>
          <span className="status present">Configured</span>
        </div>
      </section>
    );
  }

  const pages = { dashboard, registration, attendance: attendancePage, billing, reports, settings };

  if (page === 'landing') return <>{landing()}{notice && <div className="toast">{notice}</div>}</>;
  if (page === 'login') return <>{loginPage()}{notice && <div className="toast">{notice}</div>}</>;
  if (!logged) {
    setPage('login');
    return null;
  }

  return (
    <div className="app-shell">
      {sidebar()}
      <main className="main-area">
        {topbar()}
        <div className="page-content">{(pages[page] || dashboard)()}</div>
        <footer className="app-footer">
          <span onClick={goHome} style={{ cursor: 'pointer', fontWeight: 700 }}>HOSTELCARE</span> · Hostel Biometric Attendance Management System <span>2026</span>
        </footer>
      </main>
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);