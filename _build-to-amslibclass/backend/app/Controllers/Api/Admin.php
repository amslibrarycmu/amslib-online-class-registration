<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Admin extends ResourceController
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

    // --- Activity Logs ---
    
    public function activityLogs()
    {
        $page = $this->request->getVar('page') ?: 1;
        $limit = $this->request->getVar('limit') ?: 25;
        $search = $this->request->getVar('search');
        $actionType = $this->request->getVar('actionType');

        $offset = ($page - 1) * $limit;

        $builder = $this->db->table('activity_logs');

        if ($search) {
            $builder->groupStart()
                    ->like('user_name', $search)
                    ->orLike('user_email', $search)
                    ->groupEnd();
        }
        if ($actionType) {
            $builder->where('action_type', $actionType);
        }

        $total = $builder->countAllResults(false);
        $logs = $builder->orderBy('timestamp', 'DESC')->limit($limit, $offset)->get()->getResultArray();

        return $this->respond([
            'logs' => $logs,
            'total' => $total
        ]);
    }

    public function activityLogsAll()
    {
        $search = $this->request->getVar('search');
        $actionType = $this->request->getVar('actionType');

        $builder = $this->db->table('activity_logs');

        if ($search) {
            $builder->groupStart()
                    ->like('user_name', $search)
                    ->orLike('user_email', $search)
                    ->groupEnd();
        }
        if ($actionType) {
            $builder->where('action_type', $actionType);
        }

        $logs = $builder->orderBy('timestamp', 'DESC')->get()->getResultArray();

        return $this->respond($logs);
    }

    // --- Class Requests ---

    public function classRequests()
    {
        $status = $this->request->getVar('status');

        $sql = "
            SELECT
                r.request_id, r.title, r.reason, r.start_date, r.end_date, r.start_time, r.created_at,
                r.end_time, r.format, r.speaker, r.status, r.admin_comment,
                u_requester.id AS requested_by_id,
                COALESCE(u_requester.name, r.requested_by_name, r.requested_by_email) AS requested_by_name, 
                r.requested_by_email, 
                u_admin.name as action_by_name 
            FROM class_requests r
            LEFT JOIN users u_requester ON r.requested_by_email = u_requester.email
            LEFT JOIN users u_admin ON r.action_by_email = u_admin.email
        ";

        $params = [];
        if ($status) {
            $sql .= " WHERE r.status = ?";
            $params[] = $status;
        }
        $sql .= " ORDER BY r.created_at DESC";

        $results = $this->db->query($sql, $params)->getResultArray();
        return $this->respond($results);
    }

    public function handleClassRequest($requestId = null)
    {
        $user = $this->request->user;
        
        $action = $this->request->getVar('action');
        $reason = $this->request->getVar('reason');
        $adminEmail = $this->request->getVar('admin_email') ?: $user->email;

        if (!in_array($action, ['approve', 'reject'])) {
            return $this->failValidationErrors('Invalid action.');
        }

        $this->db->transStart();

        $request = $this->db->table('class_requests')->where('request_id', $requestId)->get()->getRowArray();
        if (!$request) {
            $this->db->transRollback();
            return $this->failNotFound('Request not found.');
        }

        if ($action === 'reject') {
            if (empty($reason)) {
                $this->db->transRollback();
                return $this->failValidationErrors('Rejection reason is required.');
            }
            $updateData = [
                'status' => 'rejected',
                'admin_comment' => $reason,
                'action_by_email' => $adminEmail,
                'action_at' => date('Y-m-d H:i:s')
            ];
            $this->db->table('class_requests')->where('request_id', $requestId)->update($updateData);
            
            $this->logActivity($user->id, $user->name, $user->email, 'REJECT_CLASS_REQUEST', 'REQUEST', $requestId, ['request_title' => $request['title'], 'rejected_by' => $user->email, 'reason' => $reason]);
            
            $emailService = new \App\Libraries\EmailService();
            $emailService->sendRequestRejectedNotification($request['requested_by_email'], $request, $reason);
        } else {
            $updateData = [
                'status' => 'approved',
                'admin_comment' => null,
                'action_by_email' => $adminEmail,
                'action_at' => date('Y-m-d H:i:s')
            ];
            $this->db->table('class_requests')->where('request_id', $requestId)->update($updateData);
            
            $this->logActivity($user->id, $user->name, $user->email, 'APPROVE_CLASS_REQUEST', 'REQUEST', $requestId, ['request_title' => $request['title'], 'approved_by' => $user->email]);
        }

        $this->db->transComplete();

        if ($this->db->transStatus() === false) {
            return $this->failServerError('Database error.');
        }

        return $this->respond(['message' => "Request {$action}ed successfully."]);
    }

    // --- Statistics ---

    public function classDemographics()
    {
        $filterType = $this->request->getVar('filterType');
        $year = $this->request->getVar('year');
        $month = $this->request->getVar('month');
        $startDate = $this->request->getVar('startDate');
        $endDate = $this->request->getVar('endDate');
        $rolesJSON = $this->request->getVar('roles');

        $builder = $this->db->table('classes c')
            ->select('c.class_id, c.title, c.start_date, c.registered_users')
            ->whereNotIn('c.status', ['draft', 'open']);

        if ($filterType === 'yearly' && $year) {
            $builder->where('YEAR(c.start_date)', $year);
        } else if ($filterType === 'monthly' && $year && $month) {
            $builder->where('YEAR(c.start_date)', $year)->where('MONTH(c.start_date)', $month);
        } else if ($filterType === 'range') {
            if ($startDate) $builder->where('c.start_date >=', $startDate);
            if ($endDate) $builder->where('c.start_date <=', $endDate);
        }

        $classes = $builder->orderBy('c.start_date', 'DESC')->get()->getResultArray();

        $classIds = array_column($classes, 'class_id');
        $evaluations = [];
        if (!empty($classIds)) {
            $evaluations = $this->db->table('evaluations')->whereIn('class_id', $classIds)->get()->getResultArray();
        }

        $allEmails = [];
        foreach ($classes as &$cls) {
            $registeredUsersEmails = json_decode($cls['registered_users'], true) ?: [];
            $cls['registered_users_parsed'] = $registeredUsersEmails;
            foreach ($registeredUsersEmails as $email) {
                $allEmails[$email] = true;
            }
        }
        foreach ($evaluations as $ev) {
            $allEmails[$ev['user_email']] = true;
        }

        $userRoleMap = [];
        $rolesToFilter = json_decode($rolesJSON, true) ?: [];

        $allEmailsArray = array_keys($allEmails);
        if (!empty($allEmailsArray)) {
            $users = $this->db->table('users')->select('email, roles')->whereIn('email', $allEmailsArray)->get()->getResultArray();
            foreach ($users as $u) {
                $roles = json_decode($u['roles'], true) ?: [];
                $displayRole = null;
                if (!empty($rolesToFilter)) {
                    foreach ($roles as $r) {
                        if (in_array($r, $rolesToFilter)) {
                            $displayRole = $r;
                            break;
                        }
                    }
                }
                if (!$displayRole) {
                    foreach ($roles as $r) {
                        if ($r !== 'ผู้ดูแลระบบ') {
                            $displayRole = $r;
                            break;
                        }
                    }
                }
                $userRoleMap[$u['email']] = $displayRole ?: (!empty($roles) ? $roles[0] : 'Unknown');
            }
        }

        $finalStats = [];
        foreach ($classes as $cls) {
            $demographics = [];
            $registeredUsersEmails = $cls['registered_users_parsed'];

            foreach ($registeredUsersEmails as $email) {
                $userRole = $userRoleMap[$email] ?? null;
                if ($userRole) {
                    $isNotAdminRole = $userRole !== 'ผู้ดูแลระบบ';
                    $matchesFilter = empty($rolesToFilter) || in_array($userRole, $rolesToFilter);
                    if ($isNotAdminRole && $matchesFilter) {
                        if (!isset($demographics[$userRole])) $demographics[$userRole] = 0;
                        $demographics[$userRole]++;
                    }
                }
            }

            $clsEvals = array_filter($evaluations, function($e) use ($cls) {
                return $e['class_id'] === $cls['class_id'];
            });

            $totalContent = 0; $totalMaterial = 0; $totalDuration = 0; $totalFormat = 0; $totalSpeaker = 0;
            $validEvalCount = 0;

            foreach ($clsEvals as $ev) {
                $evaluatorRole = $userRoleMap[$ev['user_email']] ?? null;
                if ($evaluatorRole) {
                    $isNotAdminRole = $evaluatorRole !== 'ผู้ดูแลระบบ';
                    $matchesFilter = empty($rolesToFilter) || in_array($evaluatorRole, $rolesToFilter);

                    if ($isNotAdminRole && $matchesFilter) {
                        $totalContent += (float)$ev['score_content'];
                        $totalMaterial += (float)$ev['score_material'];
                        $totalDuration += (float)$ev['score_duration'];
                        $totalFormat += (float)$ev['score_format'];
                        $totalSpeaker += (float)$ev['score_speaker'];
                        $validEvalCount++;
                    }
                }
            }

            $finalStats[] = [
                'class_id' => $cls['class_id'],
                'title' => $cls['title'],
                'start_date' => $cls['start_date'],
                'demographics' => $demographics,
                'total_evaluations' => $validEvalCount,
                'avg_score_content' => $validEvalCount ? ($totalContent / $validEvalCount) : 0,
                'avg_score_material' => $validEvalCount ? ($totalMaterial / $validEvalCount) : 0,
                'avg_score_duration' => $validEvalCount ? ($totalDuration / $validEvalCount) : 0,
                'avg_score_format' => $validEvalCount ? ($totalFormat / $validEvalCount) : 0,
                'avg_score_speaker' => $validEvalCount ? ($totalSpeaker / $validEvalCount) : 0,
            ];
        }

        return $this->respond($finalStats);
    }

    // --- Topics ---

    public function topics()
    {
        $topics = $this->db->table('requestable_topics')->orderBy('id', 'DESC')->get()->getResultArray();
        return $this->respond($topics);
    }

    public function createTopic()
    {
        $title = $this->request->getVar('title');
        if (empty($title)) return $this->failValidationErrors('Title is required');

        $this->db->table('requestable_topics')->insert(['title' => $title, 'is_active' => 1]);
        return $this->respondCreated(['message' => 'Topic created']);
    }

    public function updateTopic($id = null)
    {
        $title = $this->request->getVar('title');
        $isActive = $this->request->getVar('is_active');

        $data = [];
        if ($title !== null) $data['title'] = $title;
        if ($isActive !== null) $data['is_active'] = $isActive;

        if (!empty($data)) {
            $this->db->table('requestable_topics')->where('id', $id)->update($data);
        }

        return $this->respond(['message' => 'Topic updated']);
    }

    public function deleteTopic($id = null)
    {
        $this->db->table('requestable_topics')->where('id', $id)->delete();
        return $this->respond(['message' => 'Topic deleted']);
    }
}
