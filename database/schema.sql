CREATE DATABASE IF NOT EXISTS hostel_attendance;
USE hostel_attendance;

CREATE TABLE wardens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hostel_rooms (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  room_number VARCHAR(30) NOT NULL UNIQUE,
  capacity INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE students (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_code VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  course VARCHAR(120),
  department VARCHAR(120),
  phone VARCHAR(20),
  parent_phone VARCHAR(20),
  email VARCHAR(160),
  room_id BIGINT,
  joining_date DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_room FOREIGN KEY (room_id) REFERENCES hostel_rooms(id)
);

CREATE TABLE employees (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  employee_code VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  designation VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(160),
  joining_date DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE biometric_devices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  device_name VARCHAR(120) NOT NULL,
  device_type ENUM('FINGERPRINT','CAMERA') NOT NULL,
  vendor VARCHAR(120),
  device_identifier VARCHAR(160) UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE face_templates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  person_type ENUM('STUDENT','EMPLOYEE') NOT NULL,
  person_id BIGINT NOT NULL,
  encrypted_template LONGBLOB NOT NULL,
  model_version VARCHAR(80) NOT NULL,
  consent_recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_face_person(person_type, person_id)
);

CREATE TABLE attendance (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  person_type ENUM('STUDENT','EMPLOYEE') NOT NULL,
  person_id BIGINT NOT NULL,
  attendance_date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status ENUM('PRESENT','ABSENT','LEAVE') NOT NULL,
  method ENUM('FACE','FINGERPRINT','MANUAL') NOT NULL,
  device_id BIGINT,
  recorded_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_person_day(person_type, person_id, attendance_date),
  CONSTRAINT fk_att_device FOREIGN KEY (device_id) REFERENCES biometric_devices(id),
  CONSTRAINT fk_att_warden FOREIGN KEY (recorded_by) REFERENCES wardens(id)
);

CREATE TABLE bills (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  bill_number VARCHAR(50) NOT NULL UNIQUE,
  student_id BIGINT NOT NULL,
  billing_month CHAR(7) NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE,
  rent DECIMAL(10,2) NOT NULL DEFAULT 0,
  mess DECIMAL(10,2) NOT NULL DEFAULT 0,
  electricity DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(10,2) NOT NULL,
  status ENUM('PAID','UNPAID','PARTIAL') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bill_student FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  bill_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(40),
  payment_reference VARCHAR(120),
  payment_date DATE NOT NULL,
  CONSTRAINT fk_payment_bill FOREIGN KEY (bill_id) REFERENCES bills(id)
);

CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_warden_id BIGINT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_warden FOREIGN KEY (actor_warden_id) REFERENCES wardens(id)
);
