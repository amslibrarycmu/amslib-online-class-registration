<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Classes extends ResourceController
{
    use ResponseTrait;

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

    private function generateUniqueClassId()
    {
        while (true) {
            $classId = (string) rand(100000, 999999);
            $existing = $this->db->table('classes')->where('class_id', $classId)->get()->getRow();
            if (!$existing) {
                return $classId;
            }
        }
    }

    // GET /api/classes
    public function index()
    {
        $user = $this->request->user ?? null;
        $adminLevel = $user?->admin_level ?? 0;
        $email = $user?->email ?? null;

        $builder = $this->db->table('classes');
        
        if ($adminLevel > 0) {
            $builder->orderBy('created_at', 'DESC');
        } else {
            $builder->where('created_by_email', $email)->orderBy('created_at', 'DESC');
        }

        $results = $builder->get()->getResultArray();
        return $this->respond($results);
    }

    // GET /api/classes/unique-titles
    public function uniqueTitles()
    {
        $results = $this->db->table('requestable_topics')
            ->select('title')
            ->where('is_active', 1)
            ->orderBy('title', 'ASC')
            ->get()
            ->getResultArray();
            
        $titles = array_column($results, 'title');
        return $this->respond($titles);
    }

    // GET /api/classes/promoted
    public function promoted()
    {
        $results = $this->db->table('classes')
            ->where('promoted', 1)
            ->where('status !=', 'closed')
            ->orderBy('start_date', 'ASC')
            ->get()
            ->getResultArray();
            
        return $this->respond($results);
    }

    // GET /api/classes/(:any)/registrants
    public function registrants($classId = null)
    {
        $class = $this->db->table('classes')->select('registered_users')->where('class_id', $classId)->get()->getRowArray();
        if (!$class) {
            return $this->failNotFound('Class not found.');
        }

        $registeredEmails = json_decode($class['registered_users'], true);
        if (!is_array($registeredEmails) || empty($registeredEmails)) {
            return $this->respond([]);
        }

        $users = $this->db->table('users')
            ->select('name, email, phone, roles')
            ->whereIn('email', $registeredEmails)
            ->get()
            ->getResultArray();
            
        return $this->respond($users);
    }

    // POST /api/classes
    public function create()
    {
        $user = $this->request->user;
        
        $title = $this->request->getPost('title');
        $speaker = $this->request->getPost('speaker');
        $startDate = $this->request->getPost('start_date');
        $endDate = $this->request->getPost('end_date');
        $startTime = $this->request->getPost('start_time');
        $endTime = $this->request->getPost('end_time');
        $description = $this->request->getPost('description');
        $format = $this->request->getPost('format');
        $joinLink = $this->request->getPost('join_link');
        $location = $this->request->getPost('location');
        $maxParticipants = $this->request->getPost('max_participants');
        $targetGroups = $this->request->getPost('target_groups');
        $language = $this->request->getPost('language') ?: 'TH';
        $requestId = $this->request->getPost('request_id');

        if (empty($title)) {
            return $this->failValidationErrors('Title is required.');
        }
        
        $speakerArray = json_decode($speaker, true);
        if (!is_array($speakerArray) || empty($speakerArray)) {
            return $this->failValidationErrors('กรุณาระบุวิทยากรอย่างน้อย 1 คน');
        }

        $materialFileNames = [];
        if ($files = $this->request->getFiles()) {
            if (isset($files['files'])) {
                foreach ($files['files'] as $file) {
                    if ($file->isValid() && !$file->hasMoved()) {
                        $newName = time() . '-' . $file->getName();
                        $file->move(FCPATH . 'uploads/materials', $newName);
                        $materialFileNames[] = $newName;
                    }
                }
            }
        }

        $classId = $this->generateUniqueClassId();

        $data = [
            'class_id' => $classId,
            'title' => $title,
            'speaker' => $speaker,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'description' => $description,
            'format' => $format,
            'join_link' => $joinLink,
            'location' => $location ?: '',
            'max_participants' => $maxParticipants,
            'target_groups' => $targetGroups,
            'materials' => json_encode($materialFileNames),
            'created_by_email' => $user->email,
            'language' => $language
        ];

        $this->db->table('classes')->insert($data);
        $newId = $this->db->insertID();

        $this->logActivity($user->id, $user->name, $user->email, 'CREATE_CLASS', 'CLASS', $newId, ['class_title' => $title]);

        if ($requestId && $requestId !== 'null' && $requestId !== 'undefined') {
            $this->db->table('class_requests')->where('request_id', $requestId)->update(['status' => 'completed']);
            $requestData = $this->db->table('class_requests')->where('request_id', $requestId)->get()->getRowArray();
            if ($requestData) {
                $emailService = new \App\Libraries\EmailService();
                $emailService->sendRequestApprovedNotification($requestData['requested_by_email'], $requestData);
            }
        }

        return $this->respondCreated([
            'message' => 'Class created successfully',
            'classId' => $classId,
            'id' => $newId
        ]);
    }

    // PUT /api/classes/(:any)
    public function update($classId = null)
    {
        $user = $this->request->user;
        
        // CodeIgniter 4 PUT with multipart/form-data doesn't populate $_POST. 
        // Best approach is handling it via POST with _method=PUT or parsing raw stream.
        // For RESTful, it's safer to use POST and handle file uploads if multipart.
        // Assuming client uses POST with _method=PUT:
        $title = $this->request->getVar('title');
        $speaker = $this->request->getVar('speaker');
        $startDate = $this->request->getVar('start_date');
        $endDate = $this->request->getVar('end_date');
        $startTime = $this->request->getVar('start_time');
        $endTime = $this->request->getVar('end_time');
        $description = $this->request->getVar('description');
        $format = $this->request->getVar('format');
        $joinLink = $this->request->getVar('join_link');
        $maxParticipants = $this->request->getVar('max_participants');
        $targetGroups = $this->request->getVar('target_groups');
        $location = $this->request->getVar('location');
        $existingFiles = $this->request->getVar('existingFiles');
        $language = $this->request->getVar('language');

        if (empty($title)) {
            return $this->failValidationErrors('Title is required.');
        }

        $existingFileNames = json_decode($existingFiles, true) ?: [];
        $newMaterialFiles = [];

        if ($files = $this->request->getFiles()) {
            if (isset($files['files'])) {
                foreach ($files['files'] as $file) {
                    if ($file->isValid() && !$file->hasMoved()) {
                        $newName = time() . '-' . $file->getName();
                        $file->move(FCPATH . 'uploads/materials', $newName);
                        $newMaterialFiles[] = $newName;
                    }
                }
            }
        }

        $finalFileNames = array_merge($existingFileNames, $newMaterialFiles);

        $class = $this->db->table('classes')->where('class_id', $classId)->get()->getRowArray();
        if (!$class) return $this->failNotFound('Class not found');

        $roles = $user->roles ?? [];
        if (!in_array('ผู้ดูแลระบบ', $roles) && $class['created_by_email'] !== $user->email) {
            return $this->failForbidden('Forbidden: You do not have permission to edit this class.');
        }

        $data = [
            'title' => $title,
            'speaker' => $speaker,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'description' => $description,
            'format' => $format,
            'join_link' => $joinLink,
            'location' => $location ?: '',
            'max_participants' => $maxParticipants,
            'target_groups' => $targetGroups,
            'language' => $language ?: 'TH',
            'materials' => json_encode($finalFileNames)
        ];

        $this->db->table('classes')->where('class_id', $classId)->update($data);

        $this->logActivity($user->id, $user->name, $user->email, 'UPDATE_CLASS', 'CLASS', $classId, ['class_title' => $title]);
        
        return $this->respond(['message' => 'Class updated successfully']);
    }

    // DELETE /api/classes/(:any)
    public function delete($classId = null)
    {
        $user = $this->request->user;
        $class = $this->db->table('classes')->where('class_id', $classId)->get()->getRowArray();
        
        if (!$class) {
            return $this->failNotFound('Class not found');
        }

        $this->db->table('classes')->where('class_id', $classId)->delete();

        $this->logActivity($user->id, $user->name, $user->email, 'DELETE_CLASS', 'CLASS', $classId, ['class_title' => $class['title']]);

        return $this->respond(['message' => 'Class deleted successfully']);
    }

    // POST /api/classes/(:any)/register
    public function register($classId = null)
    {
        $user = $this->request->user;
        
        $this->db->transStart();
        
        $class = $this->db->table('classes')->where('class_id', $classId)->get()->getRowArray();
        
        if (!$class) {
            $this->db->transRollback();
            return $this->failNotFound('Class not found.');
        }

        $registeredUsers = json_decode($class['registered_users'], true) ?: [];

        if ($class['max_participants'] != 999 && count($registeredUsers) >= $class['max_participants']) {
            $this->db->transRollback();
            return $this->failResourceExists('This class is already full.');
        }

        if (in_array($user->email, $registeredUsers)) {
            $this->db->transRollback();
            return $this->failResourceExists('You are already registered for this class.');
        }

        $registeredUsers[] = $user->email;

        $this->db->table('classes')->where('class_id', $classId)->update([
            'registered_users' => json_encode($registeredUsers)
        ]);

        $this->logActivity($user->id, $user->name, $user->email, 'REGISTER_CLASS', 'CLASS', $classId, ['class_title' => $class['title']]);
        
        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->failServerError('Database error');
        }

        $emailService = new \App\Libraries\EmailService();
        $emailService->sendRegistrationConfirmation($user->email, $class, $user->name);

        $admins = $this->db->table('users')->select('email')->like('roles', '"ผู้ดูแลระบบ"')->get()->getResultArray();
        $adminEmails = array_column($admins, 'email');

        if (!empty($adminEmails) && !empty($registeredUsers)) {
            $allRegs = $this->db->table('users')->select('name, email')->whereIn('email', $registeredUsers)->get()->getResultArray();
            $emailService->sendAdminNotification($adminEmails, $class, $allRegs, ['name' => $user->name, 'email' => $user->email]);
        }

        return $this->respond(['message' => 'ลงทะเบียนสำเร็จแล้ว']);
    }

    // POST /api/classes/(:any)/cancel
    public function cancel($classId = null)
    {
        $user = $this->request->user;
        
        $this->db->transStart();
        
        $class = $this->db->table('classes')->where('class_id', $classId)->get()->getRowArray();
        
        if (!$class) {
            $this->db->transRollback();
            return $this->failNotFound('Class not found.');
        }

        $registeredUsers = json_decode($class['registered_users'], true) ?: [];

        if (!in_array($user->email, $registeredUsers)) {
            $this->db->transRollback();
            return $this->failResourceExists('You are not registered for this class.');
        }

        $updatedUsers = array_filter($registeredUsers, function($email) use ($user) {
            return $email !== $user->email;
        });

        $this->db->table('classes')->where('class_id', $classId)->update([
            'registered_users' => json_encode(array_values($updatedUsers))
        ]);

        $this->logActivity($user->id, $user->name, $user->email, 'CANCEL_CLASS_REGISTRATION', 'CLASS', $classId, ['class_title' => $class['title']]);
        
        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->failServerError('Database error');
        }

        $emailService = new \App\Libraries\EmailService();
        $admins = $this->db->table('users')->select('email')->like('roles', '"ผู้ดูแลระบบ"')->get()->getResultArray();
        $adminEmails = array_column($admins, 'email');

        if (!empty($adminEmails)) {
            $remaining = [];
            if (!empty($updatedUsers)) {
                $remaining = $this->db->table('users')->select('name, email')->whereIn('email', $updatedUsers)->get()->getResultArray();
            }
            $emailService->sendAdminCancellationNotification($adminEmails, $user->name, $user->email, $class, $remaining);
        }

        return $this->respond(['message' => 'ยกเลิกการลงทะเบียนสำเร็จแล้ว']);
    }

    // GET /api/classes/registered/closed
    public function registeredClosed()
    {
        $user = $this->request->user;
        
        $results = $this->db->table('classes')
            ->where('status', 'closed')
            ->like('registered_users', '"' . $user->email . '"', 'both')
            ->get()
            ->getResultArray();
            
        return $this->respond($results);
    }

    // POST /api/classes/(:any)/close
    public function closeClass($classId = null)
    {
        $user = $this->request->user;
        
        $videoLink = $this->request->getVar('video_link');
        $existingMaterials = $this->request->getVar('existing_materials');
        $isEditing = $this->request->getVar('is_editing') === 'true';

        $existingFileNames = json_decode($existingMaterials, true) ?: [];
        $newMaterialFiles = [];

        if ($files = $this->request->getFiles()) {
            if (isset($files['materials'])) {
                foreach ($files['materials'] as $file) {
                    if ($file->isValid() && !$file->hasMoved()) {
                        $newName = time() . '-' . $file->getName();
                        $file->move(FCPATH . 'uploads/materials', $newName);
                        $newMaterialFiles[] = $newName;
                    }
                }
            }
        }

        $finalMaterials = array_merge($existingFileNames, $newMaterialFiles);

        $data = [
            'status' => 'closed',
            'video_link' => $videoLink ?: null,
            'materials' => json_encode($finalMaterials)
        ];

        $this->db->table('classes')->where('class_id', $classId)->update($data);

        $action = $isEditing ? 'UPDATE_CLOSED_CLASS' : 'CLOSE_CLASS';
        $this->logActivity($user->id, $user->name, $user->email, $action, 'CLASS', $classId, ['class_id' => $classId]);

        return $this->respond(['message' => 'Class closed and materials uploaded successfully']);
    }

    // PUT /api/classes/(:any)/promote
    public function promote($classId = null)
    {
        $user = $this->request->user;
        $promoted = $this->request->getVar('promoted');

        $this->db->table('classes')->where('class_id', $classId)->update([
            'promoted' => $promoted ? 1 : 0
        ]);

        $action = $promoted ? 'PROMOTE_CLASS' : 'UNPROMOTE_CLASS';
        $this->logActivity($user->id, $user->name, $user->email, $action, 'CLASS', $classId, ['class_id' => $classId]);

        return $this->respond(['message' => 'Promotion status updated successfully']);
    }

    // GET /api/classes/(:any)/evaluations
    public function evaluations($classId = null)
    {
        $sql = "
            SELECT u.name, u.roles, e.score_content, e.score_material, e.score_duration, e.score_format, e.score_speaker, e.comments 
            FROM evaluations e 
            JOIN users u ON e.user_email = u.email 
            WHERE e.class_id = ?
        ";
        
        $results = $this->db->query($sql, [$classId])->getResultArray();

        if (empty($results)) {
            return $this->respond(['evaluations' => [], 'suggestions' => []]);
        }

        $evaluations = [];
        $suggestions = [];

        foreach ($results as $r) {
            $roles = json_decode($r['roles'], true) ?: [];
            $r['user_roles'] = $roles;
            $evaluations[] = $r;
            
            if (!empty($r['comments'])) {
                $suggestions[] = $r['comments'];
            }
        }

        return $this->respond(['evaluations' => $evaluations, 'suggestions' => $suggestions]);
    }
}
