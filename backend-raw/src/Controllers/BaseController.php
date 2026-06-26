<?php

namespace App\Controllers;

use App\AuthHelper;
use App\Database;

class BaseController {
    
    protected $db;
    protected $user;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    protected function authenticate() {
        $this->user = AuthHelper::authenticate();
        return $this->user;
    }

    protected function respond($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }

    protected function fail($message, $statusCode = 400) {
        http_response_code($statusCode);
        echo json_encode(["error" => $message]);
        exit;
    }
    
    protected function failNotFound($message = 'Not Found') {
        $this->fail($message, 404);
    }
    
    protected function failValidationErrors($message = 'Validation Error') {
        $this->fail($message, 400);
    }

    protected function failForbidden($message = 'Forbidden') {
        $this->fail($message, 403);
    }
    
    protected function failResourceExists($message = 'Resource Exists') {
        $this->fail($message, 409);
    }

    protected function logActivity($userId, $userName, $userEmail, $action, $targetType, $targetId, $details = []) {
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';

        $stmt = $this->db->prepare("INSERT INTO activity_logs (user_id, user_name, user_email, action, target_type, target_id, details, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([
            $userId, $userName, $userEmail, $action, $targetType, $targetId, json_encode($details), $ip, $userAgent
        ]);
    }
}
