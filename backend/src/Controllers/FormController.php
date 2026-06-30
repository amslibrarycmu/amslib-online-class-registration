<?php

namespace App\Controllers;

class FormController extends BaseController {

    public function index() {
        $this->authenticate();
        $adminLevel = isset($this->user->roles) && in_array("Admin", $this->user->roles) ? 1 : 0;
        $email = $this->user->email ?? null;

        if ($adminLevel > 0) {
            $stmt = $this->db->prepare("SELECT * FROM class_requests ORDER BY created_at DESC");
            $stmt->execute();
        } else {
            $stmt = $this->db->prepare("SELECT * FROM class_requests WHERE requested_by_email = ? ORDER BY created_at DESC");
            $stmt->execute([$email]);
        }

        $this->respond($stmt->fetchAll());
    }

    public function create() {
        $this->authenticate();
        $input = json_decode(file_get_contents('php://input'), true);

        $topic = $input['topic'] ?? '';
        $objective = $input['objective'] ?? '';
        $targetAudience = $input['targetAudience'] ?? '';
        $expectedParticipants = $input['expectedParticipants'] ?? null;
        $preferredDate = $input['preferredDate'] ?? null;
        $preferredTime = $input['preferredTime'] ?? null;

        if (empty($topic) || empty($objective)) {
            $this->failValidationErrors('Topic and Objective are required.');
        }

        $requestId = 'REQ-' . date('YmdHis') . '-' . rand(1000, 9999);

        $stmt = $this->db->prepare("INSERT INTO class_requests (request_id, topic, objective, target_audience, expected_participants, preferred_date, preferred_time, requested_by_email, requested_by_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())");
        $stmt->execute([
            $requestId, $topic, $objective, json_encode($targetAudience), $expectedParticipants, $preferredDate, $preferredTime, $this->user->email, $this->user->name
        ]);

        $this->logActivity(0, $this->user->name, $this->user->email, 'CREATE_CLASS_REQUEST', 'REQUEST', $requestId, ['topic' => $topic]);

        $this->respond(['message' => 'Request created successfully', 'request_id' => $requestId]);
    }

    public function update($id) {
        $this->authenticate();
        $input = json_decode(file_get_contents('php://input'), true);

        $topic = $input['topic'] ?? '';
        $objective = $input['objective'] ?? '';
        $targetAudience = $input['targetAudience'] ?? '';
        $expectedParticipants = $input['expectedParticipants'] ?? null;
        $preferredDate = $input['preferredDate'] ?? null;
        $preferredTime = $input['preferredTime'] ?? null;

        if (empty($topic) || empty($objective)) {
            $this->failValidationErrors('Topic and Objective are required.');
        }

        $stmt = $this->db->prepare("UPDATE class_requests SET topic = ?, objective = ?, target_audience = ?, expected_participants = ?, preferred_date = ?, preferred_time = ?, updated_at = NOW() WHERE request_id = ? AND status = 'pending'");
        $stmt->execute([
            $topic, $objective, json_encode($targetAudience), $expectedParticipants, $preferredDate, $preferredTime, $id
        ]);

        $this->logActivity(0, $this->user->name, $this->user->email, 'UPDATE_CLASS_REQUEST', 'REQUEST', $id, ['topic' => $topic]);

        $this->respond(['message' => 'Request updated successfully']);
    }

    public function delete($id) {
        $this->authenticate();
        $stmt = $this->db->prepare("DELETE FROM class_requests WHERE request_id = ?");
        $stmt->execute([$id]);

        $this->logActivity(0, $this->user->name, $this->user->email, 'DELETE_CLASS_REQUEST', 'REQUEST', $id);

        $this->respond(['message' => 'Request deleted successfully']);
    }

    public function approve($id) {
        $this->authenticate();
        if (!in_array("Admin", $this->user->roles ?? [])) {
            $this->failForbidden();
        }

        $stmt = $this->db->prepare("UPDATE class_requests SET status = 'approved', updated_at = NOW() WHERE request_id = ?");
        $stmt->execute([$id]);

        $this->logActivity(0, $this->user->name, $this->user->email, 'APPROVE_CLASS_REQUEST', 'REQUEST', $id);

        $this->respond(['message' => 'Request approved successfully']);
    }

    public function reject($id) {
        $this->authenticate();
        if (!in_array("Admin", $this->user->roles ?? [])) {
            $this->failForbidden();
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $reason = $input['reason'] ?? '';

        $stmt = $this->db->prepare("UPDATE class_requests SET status = 'rejected', admin_notes = ?, updated_at = NOW() WHERE request_id = ?");
        $stmt->execute([$reason, $id]);

        $this->logActivity(0, $this->user->name, $this->user->email, 'REJECT_CLASS_REQUEST', 'REQUEST', $id, ['reason' => $reason]);

        $this->respond(['message' => 'Request rejected successfully']);
    }

    public function resubmit($id) {
        $this->authenticate();
        $input = json_decode(file_get_contents('php://input'), true);

        $topic = $input['topic'] ?? '';
        $objective = $input['objective'] ?? '';
        $targetAudience = $input['targetAudience'] ?? '';
        $expectedParticipants = $input['expectedParticipants'] ?? null;
        $preferredDate = $input['preferredDate'] ?? null;
        $preferredTime = $input['preferredTime'] ?? null;

        if (empty($topic) || empty($objective)) {
            $this->failValidationErrors('Topic and Objective are required.');
        }

        $stmt = $this->db->prepare("UPDATE class_requests SET topic = ?, objective = ?, target_audience = ?, expected_participants = ?, preferred_date = ?, preferred_time = ?, status = 'pending', updated_at = NOW() WHERE request_id = ?");
        $stmt->execute([
            $topic, $objective, json_encode($targetAudience), $expectedParticipants, $preferredDate, $preferredTime, $id
        ]);

        $this->logActivity(0, $this->user->name, $this->user->email, 'RESUBMIT_CLASS_REQUEST', 'REQUEST', $id);

        $this->respond(['message' => 'Request resubmitted successfully']);
    }
}
