<?php

namespace App\Controllers;
use Firebase\JWT\JWT;
use App\Database;

class UserController extends BaseController {

    private function requireAdminLevel($level) {
        $user = $this->authenticate();
        
        $stmt = $this->db->prepare("SELECT admin_level FROM admin_permissions WHERE user_id = ?");
        $stmt->execute([$user->id]);
        $row = $stmt->fetch();
        $adminLevel = $row ? (int)$row['admin_level'] : 0;

        if ($adminLevel < $level) {
            $roles = $user->roles ?? [];
            if (in_array('ผู้ดูแลระบบ', $roles) && $level <= 3) {
                
            } else {
                http_response_code(403);
                $this->respond(['error' => 'Forbidden']);
                exit;
            }
        }
        return clone $user;
    }

    public function me() {
        $user = $this->authenticate();
        $stmt = $this->db->prepare("
            SELECT u.id, u.name, u.email, u.roles, u.is_active, u.photo, u.phone, u.pdpa, u.profile_completed, u.created_at, u.updated_at, ap.admin_level
            FROM users u
            LEFT JOIN admin_permissions ap ON u.id = ap.user_id
            WHERE u.email = ?
        ");
        $stmt->execute([$user->email]);
        $result = $stmt->fetch();
        if (!$result) {
            http_response_code(404);
            $this->respond(['error' => 'User not found']);
            exit;
        }
        $result['is_active'] = (bool)$result['is_active'];
        $result['pdpa'] = (bool)$result['pdpa'];
        $result['profile_completed'] = (bool)$result['profile_completed'];
        if (is_string($result['roles'])) {
            $result['roles'] = json_decode($result['roles'], true) ?: [];
        }
        $this->respond($result);
    }

    public function admins() {
        $this->requireAdminLevel(3);
        $stmt = $this->db->prepare("
            SELECT u.id as user_id, u.name, u.email, u.photo, ap.admin_level
            FROM users u
            JOIN admin_permissions ap ON u.id = ap.user_id
            ORDER BY ap.admin_level DESC, u.name ASC
        ");
        $stmt->execute();
        $this->respond($stmt->fetchAll());
    }

    public function search() {
        $this->requireAdminLevel(3);
        $q = $_GET['q'] ?? '';
        if (empty(trim($q))) {
            $this->respond([]);
            return;
        }
        $searchTerm = trim($q) . "%";
        $stmt = $this->db->prepare("
            SELECT u.id, u.name, u.email, u.photo, (ap.id IS NOT NULL) AS is_admin
            FROM users u
            LEFT JOIN admin_permissions ap ON u.id = ap.user_id
            WHERE (u.name LIKE ? OR u.email LIKE ?)
            LIMIT 10
        ");
        $stmt->execute([$searchTerm, $searchTerm]);
        $results = $stmt->fetchAll();
        foreach ($results as &$r) {
            $r['is_admin'] = (bool)$r['is_admin'];
        }
        $this->respond($results);
    }

    public function appointAdmin() {
        $user = $this->requireAdminLevel(3);
        $input = json_decode(file_get_contents('php://input'), true);
        $user_id = $input['user_id'] ?? null;
        $admin_level = $input['admin_level'] ?? null;
        
        if (!$user_id || !$admin_level) {
            http_response_code(400);
            $this->respond(['message' => 'Missing data']);
            return;
        }
        
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("SELECT roles FROM users WHERE id = ?");
            $stmt->execute([$user_id]);
            $row = $stmt->fetch();
            if ($row) {
                $roles = json_decode($row['roles'], true) ?: [];
                if (!in_array('ผู้ดูแลระบบ', $roles)) {
                    $roles[] = 'ผู้ดูแลระบบ';
                    $stmt2 = $this->db->prepare("UPDATE users SET roles = ? WHERE id = ?");
                    $stmt2->execute([json_encode($roles), $user_id]);
                }
            }
            
            $stmt3 = $this->db->prepare("INSERT INTO admin_permissions (user_id, admin_level) VALUES (?, ?) ON DUPLICATE KEY UPDATE admin_level = VALUES(admin_level)");
            $stmt3->execute([$user_id, $admin_level]);
            $this->db->commit();
            $this->respond(['message' => 'Appointed successfully'], 201);
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            $this->respond(['message' => 'Database error']);
        }
    }

    public function updateAdminLevel($userId) {
        $user = $this->requireAdminLevel(3);
        $input = json_decode(file_get_contents('php://input'), true);
        $admin_level = $input['admin_level'] ?? null;
        $stmt = $this->db->prepare("UPDATE admin_permissions SET admin_level = ? WHERE user_id = ?");
        $stmt->execute([$admin_level, $userId]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            $this->respond(['message' => 'Admin not found']);
            return;
        }
        $this->respond(['message' => 'Level updated']);
    }

    public function revokeAdmin($userId) {
        $user = $this->requireAdminLevel(3);
        if ((int)$userId === (int)$user->id) {
            http_response_code(400);
            $this->respond(['message' => 'Cannot remove yourself']);
            return;
        }
        
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("DELETE FROM admin_permissions WHERE user_id = ?");
            $stmt->execute([$userId]);
            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                $this->respond(['message' => 'Admin not found']);
                return;
            }
            
            $stmt2 = $this->db->prepare("SELECT roles FROM users WHERE id = ?");
            $stmt2->execute([$userId]);
            $row = $stmt2->fetch();
            if ($row) {
                $roles = json_decode($row['roles'], true) ?: [];
                $roles = array_values(array_filter($roles, function($r) { return $r !== 'ผู้ดูแลระบบ'; }));
                $stmt3 = $this->db->prepare("UPDATE users SET roles = ? WHERE id = ?");
                $stmt3->execute([json_encode($roles), $userId]);
            }
            $this->db->commit();
            $this->respond(['message' => 'Admin removed']);
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            $this->respond(['message' => 'Database error']);
        }
    }
    
    public function getPhoto($filename) {
        if (strpos($filename, '..') !== false) {
            http_response_code(400);
            echo "Invalid filename.";
            return;
        }
        $filePath = __DIR__ . '/../../public/uploads/' . basename($filename);
        if (file_exists($filePath)) {
            $mime = mime_content_type($filePath);
            header("Content-Type: $mime");
            readfile($filePath);
        } else {
            http_response_code(404);
            echo "File not found.";
        }
    }

    public function index() {
        $this->requireAdminLevel(3);
        $search = $_GET['search'] ?? '';
        $sql = "SELECT id, name, email, roles, is_active, photo, phone, pdpa, created_at, updated_at FROM users";
        $params = [];
        if (!empty($search)) {
            $sql .= " WHERE name LIKE ? OR email LIKE ?";
            $params[] = "%" . $search . "%";
            $params[] = "%" . $search . "%";
        }
        $sql .= " ORDER BY name ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll();
        foreach($results as &$r) {
            if (is_string($r['roles'])) $r['roles'] = json_decode($r['roles'], true) ?: [];
            $r['is_active'] = (bool)$r['is_active'];
            $r['pdpa'] = (bool)$r['pdpa'];
        }
        $this->respond($results);
    }

    public function show($id) {
        $this->requireAdminLevel(1);
        $stmt = $this->db->prepare("SELECT id, name, email, roles, is_active, photo, phone, pdpa, created_at, updated_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch();
        if (!$result) {
            http_response_code(404);
            $this->respond(['error' => 'User not found']);
            return;
        }
        if (is_string($result['roles'])) $result['roles'] = json_decode($result['roles'], true) ?: [];
        $result['is_active'] = (bool)$result['is_active'];
        $result['pdpa'] = (bool)$result['pdpa'];
        $this->respond($result);
    }

    public function updateRoles($id) {
        $this->requireAdminLevel(3);
        $input = json_decode(file_get_contents('php://input'), true);
        $roles = $input['roles'] ?? null;
        if (!is_array($roles)) {
            http_response_code(400);
            $this->respond(['error' => 'Roles must be array']);
            return;
        }
        $stmt = $this->db->prepare("UPDATE users SET roles = ? WHERE id = ?");
        $stmt->execute([json_encode($roles), $id]);
        
        $stmt2 = $this->db->prepare("SELECT u.*, ap.admin_level FROM users u LEFT JOIN admin_permissions ap ON u.id = ap.user_id WHERE u.id = ?");
        $stmt2->execute([$id]);
        $user = $stmt2->fetch();
        if (is_string($user['roles'])) $user['roles'] = json_decode($user['roles'], true) ?: [];
        $this->respond($user);
    }
    
    public function updateStatus($id) {
        $this->requireAdminLevel(3);
        $input = json_decode(file_get_contents('php://input'), true);
        $is_active = $input['is_active'] ?? null;
        
        if ($is_active === false || $is_active === 0 || $is_active === "0") {
            $stmt = $this->db->prepare("SELECT COUNT(*) as c FROM admin_permissions ap JOIN users u ON ap.user_id = u.id WHERE u.is_active=1");
            $stmt->execute();
            $chk = $stmt->fetch();
            $stmt2 = $this->db->prepare("SELECT user_id FROM admin_permissions WHERE user_id=?");
            $stmt2->execute([$id]);
            $usr = $stmt2->fetchAll();
            if (count($usr) > 0 && $chk['c'] <= 1) {
                http_response_code(400);
                $this->respond(['error' => 'Cannot disable last admin']);
                return;
            }
        }
        
        $stmt = $this->db->prepare("UPDATE users SET is_active = ? WHERE id = ?");
        $stmt->execute([(int)$is_active, $id]);
        $this->respond(['message' => 'Status updated']);
    }

    public function updateProfile() {
        $user = $this->authenticate();
        $input = json_decode(file_get_contents('php://input'), true);
        
        $name = $input['name'] ?? null;
        $roles = $input['roles'] ?? null;
        $phone = $input['phone'] ?? null;
        $pdpa = !empty($input['pdpa']) ? 1 : 0;
        $original_name = $input['original_name'] ?? null;
        $name_updated_by_user = !empty($input['name_updated_by_user']) ? 1 : 0;
        
        $rolesJson = is_array($roles) ? json_encode($roles) : json_encode([$roles]);
        
        $stmt = $this->db->prepare("UPDATE users SET name=?, roles=?, phone=?, pdpa=?, original_name=?, name_updated_by_user=?, profile_completed=1 WHERE id=?");
        $stmt->execute([$name, $rolesJson, $phone, $pdpa, $original_name, $name_updated_by_user, $user->id]);
        
        $stmt2 = $this->db->prepare("SELECT u.*, ap.admin_level FROM users u LEFT JOIN admin_permissions ap ON u.id = ap.user_id WHERE u.email = ?");
        $stmt2->execute([$user->email]);
        $u = $stmt2->fetch();
        
        $rolesArr = is_string($u['roles']) ? json_decode($u['roles'], true) : [];
        $u['roles'] = $rolesArr;
        
        $payload = [
            "id" => $u['id'],
            "email" => $u['email'],
            "name" => $u['name'],
            "roles" => $rolesArr,
            "admin_level" => $u['admin_level'],
            "profile_completed" => true,
            "photo" => $u['photo'],
            "iss" => $_ENV['BACKEND_URL'],
            "aud" => $_ENV['FRONTEND_URL'],
            "iat" => time(),
            "exp" => time() + (24 * 3600)
        ];
        $token = JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');
        
        $this->respond(['user' => $u, 'token' => $token]);
    }
    
    public function uploadPhoto() {
        $user = $this->authenticate();
        $email = $_POST['email'] ?? null;
        
        if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            $this->respond(['message' => 'Email and photo required.']);
            return;
        }
        
        $uploadDir = __DIR__ . '/../../public/uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        
        $filename = time() . '-' . basename($_FILES['photo']['name']);
        $dest = $uploadDir . $filename;
        move_uploaded_file($_FILES['photo']['tmp_name'], $dest);
        
        $stmt = $this->db->prepare("UPDATE users SET photo = ?, profile_completed = 1 WHERE email = ?");
        $stmt->execute([$filename, $email]);
        
        $stmt2 = $this->db->prepare("SELECT u.*, ap.admin_level FROM users u LEFT JOIN admin_permissions ap ON u.id = ap.user_id WHERE u.email = ?");
        $stmt2->execute([$email]);
        $u = $stmt2->fetch();
        
        $rolesArr = is_string($u['roles']) ? json_decode($u['roles'], true) : [];
        $u['roles'] = $rolesArr;
        
        $payload = [
            "id" => $u['id'],
            "email" => $u['email'],
            "name" => $u['name'],
            "roles" => $rolesArr,
            "admin_level" => $u['admin_level'],
            "profile_completed" => true,
            "photo" => $filename,
            "iss" => $_ENV['BACKEND_URL'],
            "aud" => $_ENV['FRONTEND_URL'],
            "iat" => time(),
            "exp" => time() + (24 * 3600)
        ];
        $token = JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');
        
        $this->respond(['user' => $u, 'token' => $token]);
    }
    
    public function deletePhoto() {
        $user = $this->authenticate();
        $email = $_GET['email'] ?? null;
        if (!$email) {
            http_response_code(400);
            $this->respond(['message' => 'Email required']);
            return;
        }
        
        $stmt = $this->db->prepare("SELECT photo FROM users WHERE email=?");
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        if ($row && $row['photo']) {
            $path = __DIR__ . '/../../public/uploads/' . $row['photo'];
            if (file_exists($path)) unlink($path);
        }
        
        $stmt2 = $this->db->prepare("UPDATE users SET photo=NULL WHERE email=?");
        $stmt2->execute([$email]);
        
        $stmt3 = $this->db->prepare("SELECT u.*, ap.admin_level FROM users u LEFT JOIN admin_permissions ap ON u.id = ap.user_id WHERE u.email = ?");
        $stmt3->execute([$email]);
        $u = $stmt3->fetch();
        
        $rolesArr = is_string($u['roles']) ? json_decode($u['roles'], true) : [];
        $u['roles'] = $rolesArr;
        
        $payload = [
            "id" => $u['id'],
            "email" => $u['email'],
            "name" => $u['name'],
            "roles" => $rolesArr,
            "admin_level" => $u['admin_level'],
            "profile_completed" => !empty($u['profile_completed']),
            "photo" => null,
            "iss" => $_ENV['BACKEND_URL'],
            "aud" => $_ENV['FRONTEND_URL'],
            "iat" => time(),
            "exp" => time() + (24 * 3600)
        ];
        $token = JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');
        
        $this->respond(['user' => $u, 'token' => $token]);
    }

    public function delete($id) {
        $this->requireAdminLevel(3);
        $stmt = $this->db->prepare("SELECT COUNT(*) as c FROM admin_permissions");
        $stmt->execute();
        $chk = $stmt->fetch();
        
        $stmt2 = $this->db->prepare("SELECT user_id FROM admin_permissions WHERE user_id=?");
        $stmt2->execute([$id]);
        $usr = $stmt2->fetchAll();
        if (count($usr) > 0 && $chk['c'] <= 1) {
            http_response_code(400);
            $this->respond(['message' => 'Cannot delete last admin']);
            return;
        }
        
        $stmt3 = $this->db->prepare("SELECT photo FROM users WHERE id=?");
        $stmt3->execute([$id]);
        $row = $stmt3->fetch();
        if ($row && $row['photo']) {
            $path = __DIR__ . '/../../public/uploads/' . $row['photo'];
            if (file_exists($path)) unlink($path);
        }
        
        $stmt4 = $this->db->prepare("DELETE FROM users WHERE id=?");
        $stmt4->execute([$id]);
        $this->respond(['message' => 'User deleted']);
    }
}
