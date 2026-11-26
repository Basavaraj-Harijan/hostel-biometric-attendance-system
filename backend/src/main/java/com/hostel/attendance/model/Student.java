package com.hostel.attendance.model;

import jakarta.persistence.*;

@Entity
@Table(name = "students")
public class Student {
    @Id
    private String id;
    private String name;
    private String course;
    private String room;
    private String phone;
    private String status;
    private boolean biometric;

    // Getters & Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCourse() { return course; }
    public void setCourse(String course) { this.course = course; }
    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isBiometric() { return biometric; }
    public void setBiometric(boolean biometric) { this.biometric = biometric; }
}