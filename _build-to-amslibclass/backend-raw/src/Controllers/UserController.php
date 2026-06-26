<?php

namespace App\Controllers;

class UserController extends BaseController {

    public function index() {
        $this->authenticate();
        $stmt = $this->db->prepare("SELECT id, name, email, phone, roles, status, created_at, updated_at FROM users");
        $stmt->execute();
        $this->respond($stmt->fetchAll());
    }

    public function create() {
        $this->authenticate();
        // Allow creating users via API payload
        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? '';
        $roles = $input['roles'] ?? ['Teacher'];
        $roleStr = in_array('Admin', $roles) ? 'admin' : 'teacher';

        $stmt = $this->db->prepare("INSERT INTO users (name, email, phone, role, roles, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', NOW())");
        $stmt->execute([$name, $email, $phone, $roleStr, json_encode($roles)]);
        
        $this->respond(['message' => 'User created successfully', 'id' => $this->db->lastInsertId()]);
    }

    public function update($id) {
        $this->authenticate();
        $input = json_decode(file_get_contents('php://input'), true);

        $name = $input['name'] ?? null;
        $email = $input['email'] ?? null;
        $phone = $input['phone'] ?? null;
        $roles = $input['roles'] ?? null;
        $status = $input['status'] ?? null;

        $updates = [];
        $params = [];

        if ($name) { $updates[] = "name = ?"; $params[] = $name; }
        if ($email) { $updates[] = "email = ?"; $params[] = $email; }
        if ($phone) { $updates[] = "phone = ?"; $params[] = $phone; }
        if ($roles) { 
            $updates[] = "roles = ?"; 
            $params[] = json_encode($roles); 
            $updates[] = "role = ?"; 
            $params[] = in_array('Admin', $roles) ? 'admin' : 'teacher';
        }
        if ($status) { $updates[] = "status = ?"; $params[] = $status; }

        if (empty($updates)) {
            $this->respond(['message' => 'No changes made']);
        }

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(", ", $updates) . ", updated_at = NOW() WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        $this->respond(['message' => 'User updated successfully']);
    }

    public function delete($id) {
        $this->authenticate();
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $this->respond(['message' => 'User deleted successfully']);
    }
}
