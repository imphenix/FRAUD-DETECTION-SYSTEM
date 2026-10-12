package com.fraud.model;

/**
 * Represents a System Security Administrator or Compliance Analyst.
 * 
 * Demonstrates:
 * - OOP Inheritance (extends User)
 * - Method overriding (polymorphism)
 * - Specialized administrative properties and actions
 */
public class Admin extends User {

    private String department;
    private int securityClearanceLevel; // 1 (Junior Analyst) to 5 (Chief Security Officer)

    public Admin() {
        super();
        setRole(Role.ADMIN);
        this.department = "Fraud & Risk Operations";
        this.securityClearanceLevel = 3;
    }

    public Admin(Long id, String username, String passwordHash, String fullName, String email, String phone) {
        super(id, username, passwordHash, fullName, email, phone, Role.ADMIN);
        this.department = "Fraud & Risk Operations";
        this.securityClearanceLevel = 3;
    }

    public Admin(Long id, String username, String passwordHash, String fullName, String email, String phone, String department, int securityClearanceLevel) {
        super(id, username, passwordHash, fullName, email, phone, Role.ADMIN);
        this.department = department;
        this.securityClearanceLevel = securityClearanceLevel;
    }

    @Override
    public String getDashboardGreeting() {
        return "Welcome, Security Administrator " + getFullName() + " [" + department + " - Level " + securityClearanceLevel + "]";
    }

    @Override
    public boolean hasAdminPrivileges() {
        return true;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public int getSecurityClearanceLevel() {
        return securityClearanceLevel;
    }

    public void setSecurityClearanceLevel(int securityClearanceLevel) {
        this.securityClearanceLevel = securityClearanceLevel;
    }

    @Override
    public String toString() {
        return "Admin{" +
                "id=" + getId() +
                ", username='" + getUsername() + '\'' +
                ", fullName='" + getFullName() + '\'' +
                ", department='" + department + '\'' +
                ", clearanceLevel=" + securityClearanceLevel +
                '}';
    }
}
