<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Requests extends ResourceController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    private function logActivity($userId, $userName, $userEmail, $action, $targetType, $targetId, $details = [])
    {
        $request = \Config\Services::request();
        $ip = $request->getIPAddress();
        $userAgent = $request->getUserAgent()->getAgentString();

        $data = [
            'user_id' => $userId,
            'user_name' => $userName,
            'user_email' => $userEmail,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'details' => json_encode($details),
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $this->db->table('activity_logs')->insert($data);
    }

    // GET /api/requests
    public function index()
    {
        $user = $this->request->user;
        
        $sql = "
            SELECT request_id, title, created_at, updated_at, status, start_date, end_date, start_time, end_time, admin_comment, speaker, reason, format 
            FROM class_requests 
            WHERE requested_by_email = ?
            ORDER BY created_at DESC
        ";

        $results = $this->db->query($sql, [$user->email])->getResultArray();
        
        return $this->respond($results);
    }

    // POST /api/requests
    public function create()
    {
        $user = $this->request->user;
        
        $title = $this->request->getVar('title');
        $reason = $this->request->getVar('reason');
        $startDate = $this->request->getVar('startDate');
        $endDate = $this->request->getVar('endDate');
        $startTime = $this->request->getVar('startTime');
        $endTime = $this->request->getVar('endTime');
        $format = $this->request->getVar('format');
        $speaker = $this->request->getVar('speaker');

        if (empty($title)) {
            return $this->failValidationErrors('Title is required.');
        }

        $data = [
            'title' => $title,
            'reason' => $reason ?: null,
            'start_date' => $startDate ?: null,
            'end_date' => $endDate ?: null,
            'start_time' => $startTime ?: null,
            'end_time' => $endTime ?: null,
            'format' => $format ?: 'ONLINE',
            'speaker' => $speaker ?: null,
            'requested_by_email' => $user->email,
            'requested_by_name' => $user->name
        ];

        $this->db->table('class_requests')->insert($data);
        $newId = $this->db->insertID();

        $this->logActivity($user->id, $user->name, $user->email, 'SUBMIT_CLASS_REQUEST', 'REQUEST', $newId, ['request_title' => $title]);

        $emailService = new \App\Libraries\EmailService();
        $emailService->sendRequestSubmittedConfirmation($user->email, $data, $user->name);

        $admins = $this->db->table('users')->select('email')->like('roles', '"ผู้ดูแลระบบ"')->get()->getResultArray();
        $adminEmails = array_column($admins, 'email');
        if (!empty($adminEmails)) {
            $data['requestedBy'] = ['name' => $user->name, 'email' => $user->email];
            $emailService->sendNewClassRequestAdminNotification($adminEmails, $data);
        }

        return $this->respondCreated(['message' => 'Class request submitted successfully!']);
    }

    // PUT /api/requests/(:num)
    public function update($requestId = null)
    {
        $user = $this->request->user;
        
        $title = $this->request->getVar('title');
        $reason = $this->request->getVar('reason');
        $startDate = $this->request->getVar('startDate');
        $endDate = $this->request->getVar('endDate');
        $startTime = $this->request->getVar('startTime');
        $endTime = $this->request->getVar('endTime');
        $format = $this->request->getVar('format');
        $speaker = $this->request->getVar('speaker');

        if (empty($title)) {
            return $this->failValidationErrors('Title is required.');
        }

        $requestCheck = $this->db->table('class_requests')->where('request_id', $requestId)->get()->getRowArray();
        
        if (!$requestCheck) {
            return $this->failNotFound('Request not found.');
        }

        if ($requestCheck['requested_by_email'] !== $user->email) {
            return $this->failForbidden('Forbidden: You do not have permission to edit this request.');
        }

        $data = [
            'title' => $title,
            'reason' => $reason,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'format' => $format,
            'speaker' => $speaker,
            'status' => 'pending',
            'admin_comment' => null
        ];

        $this->db->table('class_requests')->where('request_id', $requestId)->update($data);

        $this->logActivity($user->id, $user->name, $user->email, 'UPDATE_CLASS_REQUEST', 'REQUEST', $requestId, ['request_title' => $title]);

        return $this->respond(['message' => 'Class request updated successfully!']);
    }

    // DELETE /api/requests/(:num)
    public function delete($requestId = null)
    {
        $user = $this->request->user;
        
        $requestCheck = $this->db->table('class_requests')->where('request_id', $requestId)->get()->getRowArray();
        
        if (!$requestCheck) {
            return $this->failNotFound('Request not found.');
        }

        if ($requestCheck['requested_by_email'] !== $user->email) {
            return $this->failForbidden('Forbidden: You do not have permission to delete this request.');
        }

        $this->db->table('class_requests')->where('request_id', $requestId)->delete();

        $this->logActivity($user->id, $user->name, $user->email, 'DELETE_CLASS_REQUEST', 'REQUEST', $requestId, ['deleted_request_id' => $requestId]);

        return $this->respond(['message' => 'Class request deleted successfully!']);
    }
}
