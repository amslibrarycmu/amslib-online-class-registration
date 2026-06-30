<?php

namespace App\Controllers;
use App\Database;

class AdminController extends BaseController {

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

    public function activityLogs() {
        $this->requireAdminLevel(3);
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 25;
        $search = $_GET['search'] ?? '';
        $actionType = $_GET['actionType'] ?? '';
        
        $offset = ($page - 1) * $limit;

        $sql = "SELECT SQL_CALC_FOUND_ROWS * FROM activity_logs";
        $whereClauses = [];
        $params = [];

        if ($search) {
            $whereClauses[] = "(user_name LIKE ? OR user_email LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        if ($actionType) {
            $whereClauses[] = "action_type = ?";
            $params[] = $actionType;
        }

        if (count($whereClauses) > 0) {
            $sql .= " WHERE " . implode(" AND ", $whereClauses);
        }

        $sql .= " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
        
        $stmt = $this->db->prepare($sql);
        
        // bind values since LIMIT/OFFSET must be integers in PDO emulate prepares
        $paramIndex = 1;
        foreach ($params as $param) {
            $stmt->bindValue($paramIndex++, $param);
        }
        $stmt->bindValue($paramIndex++, $limit, \PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, \PDO::PARAM_INT);
        
        $stmt->execute();
        $logs = $stmt->fetchAll();

        $stmt2 = $this->db->query("SELECT FOUND_ROWS() as total");
        $total = $stmt2->fetch()['total'];

        $this->respond([
            'logs' => $logs,
            'total' => (int)$total
        ]);
    }

    public function getTopics() {
        $this->requireAdminLevel(3);
        $stmt = $this->db->query("SELECT * FROM requestable_topics ORDER BY id DESC");
        $this->respond($stmt->fetchAll());
    }

    public function createTopic() {
        $this->requireAdminLevel(3);
        $input = json_decode(file_get_contents('php://input'), true);
        $title = $input['title'] ?? null;
        if (!$title) {
            http_response_code(400);
            $this->respond(['message' => 'Title is required']);
            return;
        }
        $stmt = $this->db->prepare("INSERT INTO requestable_topics (title, is_active) VALUES (?, true)");
        $stmt->execute([$title]);
        http_response_code(201);
        $this->respond(['message' => 'Topic created']);
    }

    public function updateTopic($id) {
        $this->requireAdminLevel(3);
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (isset($input['title'])) {
            $stmt = $this->db->prepare("UPDATE requestable_topics SET title = ? WHERE id = ?");
            $stmt->execute([$input['title'], $id]);
        }
        if (isset($input['is_active'])) {
            $stmt = $this->db->prepare("UPDATE requestable_topics SET is_active = ? WHERE id = ?");
            $stmt->execute([$input['is_active'], $id]);
        }
        $this->respond(['message' => 'Topic updated']);
    }

    public function deleteTopic($id) {
        $this->requireAdminLevel(3);
        $stmt = $this->db->prepare("DELETE FROM requestable_topics WHERE id = ?");
        $stmt->execute([$id]);
        $this->respond(['message' => 'Topic deleted']);
    }
}
