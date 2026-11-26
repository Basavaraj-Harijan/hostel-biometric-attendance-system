package com.hostel.attendance.model;

import jakarta.persistence.*;

@Entity
@Table(name = "employees")
public class Employee {
    @Id
    private String id;
    private String name;
    private String role;
    private String phone;
    private String status;
    private boolean biometric;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isBiometric() { return biometric; }
    public void setBiometric(boolean biometric) { this.biometric = biometric; }
}