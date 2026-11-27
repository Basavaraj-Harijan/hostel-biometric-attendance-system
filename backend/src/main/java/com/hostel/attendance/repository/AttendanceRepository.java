package com.hostel.attendance.repository;

import com.hostel.attendance.model.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {
    Optional<AttendanceRecord> findByPersonIdAndAttendanceDate(String personId, LocalDate date);
    long countByPersonId(String personId);
}