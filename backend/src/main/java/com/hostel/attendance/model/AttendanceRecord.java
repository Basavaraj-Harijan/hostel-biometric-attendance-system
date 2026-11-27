package com.hostel.attendance.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "attendance_records")
public class AttendanceRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String personId;
    private String personName;
    private LocalDate attendanceDate;
    private LocalTime punchTime;
    private String status; // "Present" ಅಥವಾ "Late Entry"
    private double confidence;

    // Getters & Setters
    public Long getId() { return id; }
    public String getPersonId() { return personId; }
    public void setPersonId(String personId) { this.personId = personId; }
    public String getPersonName() { return personName; }
    public void setPersonName(String personName) { this.personName = personName; }
    public LocalDate getAttendanceDate() { return attendanceDate; }
    public void setAttendanceDate(LocalDate attendanceDate) { this.attendanceDate = attendanceDate; }
    public LocalTime getPunchTime() { return punchTime; }
    public void setPunchTime(LocalTime punchTime) { this.punchTime = punchTime; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }
}
