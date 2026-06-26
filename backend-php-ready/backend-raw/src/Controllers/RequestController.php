<?php

namespace App\Controllers;
use App\Database;

class RequestController extends BaseController {

    private function requireAdminLevel($level) {
        $user = $this->authenticate();
        $stmt = $this->db->prepare("SELECT admin_level FROM admin_permissions WHERE user_id = ?");
        $stmt->execute([$user->id]);
        $row = $stmt->fetch();
        $adminLevel = $row ? (int)$row['admin_level'] : 0;
        
        if ($adminLevel < $level) {
            $roles = $user->roles ?? [];
            if (in_array('ผู้ดูแลระบบ', $roles) && $level <= 3) {
                $adminLevel = 3;
            } else {
                http_response_code(403);
                $this->respond(['error' => 'Forbidden']);
                exit;
            }
        }
        $user->admin_level = $adminLevel;
        return $user;
    }

    public function index() {
        $user = $this->authenticate();
        $stmt = $this->db->prepare("
            SELECT request_id, title, created_at, updated_at, status, start_date, end_date, start_time, end_time, admin_comment, speaker, reason, format 
            FROM class_requests 
            WHERE requested_by_email = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$user->email]);
        $this->respond($stmt->fetchAll());
    }

    public function create() {
        $user = $this->authenticate();
        $input = json_decode(file_get_contents('php://input'), true);

        $title = $input['title'] ?? null;
        $reason = $input['reason'] ?? null;
        $startDate = $input['startDate'] ?? null;
        $endDate = $input['endDate'] ?? null;
        $startTime = $input['startTime'] ?? null;
        $endTime = $input['endTime'] ?? null;
        $format = $input['format'] ?? 'ONLINE';
        $speaker = $input['speaker'] ?? null;

        if (!$title) {
            http_response_code(400);
            $this->respond(['message' => 'Title is required.']);
            return;
        }

        $sql = "INSERT INTO class_requests (title, reason, start_date, end_date, start_time, end_time, format, speaker, requested_by_email, requested_by_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $title, $reason, $startDate, $endDate, $startTime, $endTime, $format, $speaker, $user->email, $user->name
        ]);

        $newId = $this->db->lastInsertId();

        $this->logActivity(0, $user->name, $user->email, 'SUBMIT_CLASS_REQUEST', 'REQUEST', $newId, ['request_title' => $title]);

        http_response_code(201);
        $this->respond(['message' => 'Class request submitted successfully!']);
    }

    public function update($id) {
        $user = $this->authenticate();
        $input = json_decode(file_get_contents('php://input'), true);

        $stmt = $this->db->prepare("SELECT requested_by_email FROM class_requests WHERE request_id = ?");
        $stmt->execute([$id]);
        $req = $stmt->fetch();

        if (!$req) {
            http_response_code(404);
            $this->respond(['message' => 'Request not found.']);
            return;
        }

        if ($req['requested_by_email'] !== $user->email) {
            http_response_code(403);
            $this->respond(['message' => 'Forbidden']);
            return;
        }

        $title = $input['title'] ?? null;
        if (!$title) {
            http_response_code(400);
            $this->respond(['message' => 'Title is required.']);
            return;
        }

        $sql = "UPDATE class_requests SET title = ?, reason = ?, start_date = ?, end_date = ?, 
                start_time = ?, end_time = ?, format = ?, speaker = ?,
                status = 'pending', admin_comment = NULL
                WHERE request_id = ?";
        
        $stmt2 = $this->db->prepare($sql);
        $stmt2->execute([
            $title, $input['reason'] ?? null, $input['startDate'] ?? null, $input['endDate'] ?? null,
            $input['startTime'] ?? null, $input['endTime'] ?? null, $input['format'] ?? null, $input['speaker'] ?? null, $id
        ]);

        $this->logActivity(0, $user->name, $user->email, 'UPDATE_CLASS_REQUEST', 'REQUEST', $id, ['request_title' => $title]);
        $this->respond(['message' => 'Class request updated successfully!']);
    }

    public function delete($id) {
        $user = $this->authenticate();
        
        $stmt = $this->db->prepare("SELECT requested_by_email FROM class_requests WHERE request_id = ?");
        $stmt->execute([$id]);
        $req = $stmt->fetch();

        if (!$req) {
            http_response_code(404);
            $this->respond(['message' => 'Request not found.']);
            return;
        }

        if ($req['requested_by_email'] !== $user->email) {
            http_response_code(403);
            $this->respond(['message' => 'Forbidden']);
            return;
        }

        $stmt2 = $this->db->prepare("DELETE FROM class_requests WHERE request_id = ?");
        $stmt2->execute([$id]);

        $this->logActivity(0, $user->name, $user->email, 'DELETE_CLASS_REQUEST', 'REQUEST', $id, ['deleted_request_id' => $id]);
        $this->respond(['message' => 'Class request deleted successfully!']);
    }

    // Admin routes below

    public function adminIndex() {
        $user = $this->requireAdminLevel(1);
        $sql = "
            SELECT cr.*, u.id as requested_by_id, 
            u.name as requested_by_name, u.email as requested_by_email
            FROM class_requests cr
            LEFT JOIN users u ON cr.requested_by_email = u.email
            ORDER BY cr.created_at DESC
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        $this->respond($stmt->fetchAll());
    }

    public function adminProcess($id) {
        $user = $this->requireAdminLevel(1);
        $input = json_decode(file_get_contents('php://input'), true);

        $action = $input['action'] ?? null;
        $reason = $input['reason'] ?? null;

        $stmt = $this->db->prepare("SELECT * FROM class_requests WHERE request_id = ?");
        $stmt->execute([$id]);
        $req = $stmt->fetch();

        if (!$req) {
            http_response_code(404);
            $this->respond(['message' => 'Request not found.']);
            return;
        }

        if ($action === 'approve') {
            $stmt2 = $this->db->prepare("UPDATE class_requests SET status = 'approved', action_by_id = ?, action_by_name = ? WHERE request_id = ?");
            $stmt2->execute([$user->id, $user->name, $id]);
            
            $this->logActivity(0, $user->name, $user->email, 'APPROVE_CLASS_REQUEST', 'REQUEST', $id, ['request_title' => $req['title']]);
            $this->respond(['message' => 'Class request approved.']);
        } else if ($action === 'reject') {
            $stmt2 = $this->db->prepare("UPDATE class_requests SET status = 'rejected', rejection_reason = ?, action_by_id = ?, action_by_name = ? WHERE request_id = ?");
            $stmt2->execute([$reason, $user->id, $user->name, $id]);
            
            $this->logActivity(0, $user->name, $user->email, 'REJECT_CLASS_REQUEST', 'REQUEST', $id, ['request_title' => $req['title']]);
            $this->respond(['message' => 'Class request rejected.']);
        } else {
            http_response_code(400);
            $this->respond(['message' => 'Invalid action']);
        }
    }
}
