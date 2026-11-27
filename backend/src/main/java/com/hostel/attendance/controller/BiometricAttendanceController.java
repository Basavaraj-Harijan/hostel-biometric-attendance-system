package com.hostel.attendance.controller;

import com.hostel.attendance.model.AttendanceRecord;
import com.hostel.attendance.model.Student;
import com.hostel.attendance.repository.AttendanceRepository;
import com.hostel.attendance.repository.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/biometric")
@CrossOrigin(origins = "*")
public class BiometricAttendanceController {

    private final AttendanceRepository attendanceRepo;
    private final StudentRepository studentRepo;

    public BiometricAttendanceController(AttendanceRepository attendanceRepo, StudentRepository studentRepo) {
        this.attendanceRepo = attendanceRepo;
        this.studentRepo = studentRepo;
    }

    @PostMapping("/mark-attendance")
    public ResponseEntity<Object> markAttendance(@RequestBody Map<String, Object> payload) {
        try {
            String personId = String.valueOf(payload.getOrDefault("personId", ""));
            String personName = String.valueOf(payload.getOrDefault("personName", "Unknown"));
            double confidence = 90.0;
            if (payload.get("confidence") != null) {
                confidence = Double.parseDouble(String.valueOf(payload.get("confidence")));
            }

            LocalDate today = LocalDate.now();
            LocalTime now = LocalTime.now();

            if (attendanceRepo.findByPersonIdAndAttendanceDate(personId, today).isPresent()) {
                Map<String, String> conflict = new HashMap<>();
                conflict.put("message", personName + " is already marked present today!");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(conflict);
            }

            String status = now.isAfter(LocalTime.of(21, 30)) ? "Late Entry" : "Present";

            AttendanceRecord record = new AttendanceRecord();
            record.setPersonId(personId);
            record.setPersonName(personName);
            record.setAttendanceDate(today);
            record.setPunchTime(now);
            record.setStatus(status);
            record.setConfidence(confidence);

            attendanceRepo.save(record);
            return ResponseEntity.ok(record);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> err = new HashMap<>();
            err.put("message", "Server Error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }

    @GetMapping("/records")
    public List<AttendanceRecord> getAllRecords() {
        return attendanceRepo.findAll();
    }

    @GetMapping("/defaulters")
    public List<Object> getDefaulters(@RequestParam(defaultValue = "30") int totalDays) {
        List<Object> defaulters = new ArrayList<>();
        for (Student s : studentRepo.findAll()) {
            String studentId = String.valueOf(s.getId());
            long presentDays = attendanceRepo.countByPersonId(studentId);
            double percentage = (presentDays * 100.0) / totalDays;

            if (percentage < 75.0) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", studentId);
                item.put("name", s.getName());
                item.put("room", s.getRoom());
                item.put("percentage", Math.round(percentage * 10.0) / 10.0);
                defaulters.add(item);
            }
        }
        return defaulters;
    }
}