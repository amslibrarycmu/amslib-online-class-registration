<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Users extends ResourceController
{
    protected $format = 'json';
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    private function logActivity($userId, $userName, $userEmail, $action, $targetType, $targetId, $details = [])
    {
        // IP Address and User Agent
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

        // Insert into activity_logs table
        $this->db->table('activity_logs')->insert($data);
    }

    public function testDb()
    {
        $query = $this->db->query("SELECT 1 as db_is_alive");
        return $this->respond(['status' => 'OK', 'db' => $query->getRow()]);
    }

    // GET /api/users/me
    public function me()
    {
        $user = $_SERVER['user'] ?? null;
        if (!$user || empty($user['email'])) {
            return $this->failUnauthorized('Unauthorized');
        }

        $email = $user['email'];
        $sql = "
            SELECT u.id, u.name, u.email, u.roles, u.is_active, u.photo, u.phone, u.pdpa, u.profile_completed, u.created_at, u.updated_at, ap.admin_level
            FROM users u
            LEFT JOIN admin_permissions ap ON u.id = ap.user_id
            WHERE u.email = ?
        ";
        
        $query = $this->db->query($sql, [$email]);
        $result = $query->getRow();

        if (!$result) {
            return $this->failNotFound('User not found');
        }

        // Convert roles back to array for frontend
        $result->roles = json_decode($result->roles) ?? [];

        return $this->respond($result);
    }

    // GET /api/users/admins
    public function admins()
    {
        $sql = "
            SELECT u.id as user_id, u.name, u.email, u.photo, ap.admin_level
            FROM users u
            JOIN admin_permissions ap ON u.id = ap.user_id
            ORDER BY ap.admin_level DESC, u.name ASC
        ";
        $query = $this->db->query($sql);
        return $this->respond($query->getResult());
    }

    // GET /api/users/search
    public function search()
    {
        $q = $this->request->getGet('q');
        if (empty($q) || trim($q) === '') {
            return $this->respond([]);
        }

        $searchTerm = trim($q) . '%';
        $sql = "
            SELECT u.id, u.name, u.email, u.photo, (ap.id IS NOT NULL) AS is_admin
            FROM users u
            LEFT JOIN admin_permissions ap ON u.id = ap.user_id
            WHERE (u.name LIKE ? OR u.email LIKE ?)
            LIMIT 10
        ";

        $query = $this->db->query($sql, [$searchTerm, $searchTerm]);
        $results = $query->getResult();
        
        foreach ($results as &$row) {
            $row->is_admin = (bool) $row->is_admin;
        }

        return $this->respond($results);
    }

    // POST /api/users/admins/appoint
    public function appointAdmin()
    {
        $user_id = $this->request->getVar('user_id');
        $admin_level = $this->request->getVar('admin_level');

        if (!$user_id || !$admin_level) {
            return $this->fail('Missing data', 400);
        }

        try {
            // Update roles
            $this->db->query("
                UPDATE users 
                SET roles = JSON_ARRAY_APPEND(COALESCE(roles, '[]'), '$', 'ผู้ดูแลระบบ')
                WHERE id = ? AND NOT JSON_CONTAINS(COALESCE(roles, '[]'), '\"ผู้ดูแลระบบ\"', '$')
            ", [$user_id]);

            // Insert or Update admin_permissions
            $this->db->query("
                INSERT INTO admin_permissions (user_id, admin_level) VALUES (?, ?) 
                ON DUPLICATE KEY UPDATE admin_level = VALUES(admin_level)
            ", [$user_id, $admin_level]);

            $me = (array) $_SERVER['user'];
            $this->logActivity($me['id'] ?? null, $me['name'] ?? '', $me['email'] ?? '', 'APPOINT_ADMIN', 'USER', $user_id, ['new_level' => $admin_level]);

            return $this->respondCreated(['message' => 'Appointed successfully']);
        } catch (\Exception $e) {
            return $this->failServerError('Database error');
        }
    }

    // PUT /api/users/admins/:userId/level
    public function updateAdminLevel($userId = null)
    {
        $admin_level = $this->request->getVar('admin_level');
        try {
            $this->db->query("UPDATE admin_permissions SET admin_level = ? WHERE user_id = ?", [$admin_level, $userId]);
            if ($this->db->affectedRows() === 0) {
                return $this->failNotFound('Admin not found');
            }
            
            $me = (array) $_SERVER['user'];
            $this->logActivity($me['id'] ?? null, $me['name'] ?? '', $me['email'] ?? '', 'CHANGE_ADMIN_LEVEL', 'USER', $userId, ['new_level' => $admin_level]);

            return $this->respond(['message' => 'Level updated']);
        } catch (\Exception $e) {
            return $this->failServerError('Database error');
        }
    }

    // DELETE /api/users/admins/:userId
    public function removeAdmin($userId = null)
    {
        $me = (array) $_SERVER['user'];
        if ((int)$userId === (int)($me['id'] ?? 0)) {
            return $this->fail('Cannot remove yourself', 400);
        }

        try {
            $this->db->query("DELETE FROM admin_permissions WHERE user_id = ?", [$userId]);
            if ($this->db->affectedRows() === 0) {
                return $this->failNotFound('Admin not found');
            }

            $this->db->query("
                UPDATE users
                SET roles = JSON_REMOVE(roles, JSON_UNQUOTE(JSON_SEARCH(roles, 'one', 'ผู้ดูแลระบบ')))
                WHERE id = ? AND JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"', '$')
            ", [$userId]);

            $this->logActivity($me['id'] ?? null, $me['name'] ?? '', $me['email'] ?? '', 'REVOKE_ADMIN', 'USER', $userId, []);

            return $this->respondDeleted(['message' => 'Admin removed']);
        } catch (\Exception $e) {
            return $this->failServerError('Database error');
        }
    }

    // GET /api/users
    public function index()
    {
        $search = $this->request->getGet('search') ?? '';
        $sql = "SELECT id, name, email, roles, is_active, photo, phone, pdpa, created_at, updated_at FROM users";
        $params = [];

        if ($search) {
            $sql .= " WHERE name LIKE ? OR email LIKE ?";
            $params[] = $search . '%';
            $params[] = $search . '%';
        }
        $sql .= " ORDER BY name ASC";

        $query = $this->db->query($sql, $params);
        $results = $query->getResult();
        foreach ($results as &$row) {
            $row->roles = json_decode($row->roles) ?? [];
        }

        return $this->respond($results);
    }

    // GET /api/users/:id
    public function show($id = null)
    {
        $sql = "SELECT id, name, email, roles, is_active, photo, phone, pdpa, created_at, updated_at FROM users WHERE id = ?";
        $query = $this->db->query($sql, [$id]);
        $result = $query->getRow();

        if (!$result) {
            return $this->failNotFound('User not found');
        }
        $result->roles = json_decode($result->roles) ?? [];

        return $this->respond($result);
    }
}
