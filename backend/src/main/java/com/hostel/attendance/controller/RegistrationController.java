package com.hostel.attendance.controller;

import com.hostel.attendance.model.Student;
import com.hostel.attendance.repository.StudentRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "http://localhost:5173")
public class RegistrationController {

    private final StudentRepository studentRepo;

    public RegistrationController(StudentRepository studentRepo) {
        this.studentRepo = studentRepo;
    }

    @GetMapping
    public List<Student> getAllStudents() {
        return studentRepo.findAll();
    }

    @PostMapping
    public Student saveStudent(@RequestBody Student student) {
        return studentRepo.save(student);
    }
}