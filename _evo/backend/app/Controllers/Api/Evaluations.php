<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Evaluations extends ResourceController
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

    // GET /api/evaluations/user-status
    public function userStatus()
    {
        $user = $this->request->user;
        
        $sql = "SELECT DISTINCT class_id FROM evaluations WHERE user_email = ?";
        $results = $this->db->query($sql, [$user->email])->getResultArray();
        
        $classIds = array_column($results, 'class_id');
        
        return $this->respond($classIds);
    }

    // POST /api/evaluations
    public function create()
    {
        $user = $this->request->user;
        
        $classId = $this->request->getVar('class_id');
        $scoreContent = $this->request->getVar('score_content');
        $scoreMaterial = $this->request->getVar('score_material');
        $scoreDuration = $this->request->getVar('score_duration');
        $scoreFormat = $this->request->getVar('score_format');
        $scoreSpeaker = $this->request->getVar('score_speaker');
        $comment = $this->request->getVar('comment');

        if (empty($classId) || $scoreContent === null) {
            return $this->failValidationErrors('Missing required evaluation data.');
        }

        $check = $this->db->table('evaluations')
            ->where('class_id', $classId)
            ->where('user_email', $user->email)
            ->get()
            ->getRow();

        if ($check) {
            return $this->failResourceExists('You have already submitted an evaluation for this class.');
        }

        $data = [
            'class_id' => $classId,
            'user_email' => $user->email,
            'score_content' => $scoreContent,
            'score_material' => $scoreMaterial,
            'score_duration' => $scoreDuration,
            'score_format' => $scoreFormat,
            'score_speaker' => $scoreSpeaker,
            'comments' => $comment ?: null
        ];

        $this->db->table('evaluations')->insert($data);

        $this->logActivity($user->id, $user->name, $user->email, 'SUBMIT_EVALUATION', 'CLASS', $classId, ['class_id' => $classId]);

        return $this->respondCreated(['message' => 'Evaluation submitted successfully.']);
    }
}
