<?php

namespace App\Controllers;

class ClassController extends BaseController {

    private function generateUniqueClassId() {
        while (true) {
            $classId = (string) rand(100000, 999999);
            $stmt = $this->db->prepare("SELECT 1 FROM classes WHERE class_id = ?");
            $stmt->execute([$classId]);
            if (!$stmt->fetch()) {
                return $classId;
            }
        }
    }

    public function index() {
        $this->authenticate();
        $adminLevel = isset($this->user->roles) && in_array("Admin", $this->user->roles) ? 1 : 0;
        $email = $this->user->email ?? null;

        if ($adminLevel > 0) {
            $stmt = $this->db->prepare("SELECT * FROM classes ORDER BY created_at DESC");
            $stmt->execute();
        } else {
            $stmt = $this->db->prepare("SELECT * FROM classes WHERE created_by_email = ? ORDER BY created_at DESC");
            $stmt->execute([$email]);
        }

        $this->respond($stmt->fetchAll());
    }

    public function uniqueTitles() {
        $stmt = $this->db->prepare("SELECT title FROM requestable_topics WHERE is_active = 1 ORDER BY title ASC");
        $stmt->execute();
        $results = $stmt->fetchAll();
        $titles = array_column($results, 'title');
        $this->respond($titles);
    }

    public function promoted() {
        $stmt = $this->db->prepare("SELECT * FROM classes WHERE promoted = 1 AND status != 'closed' ORDER BY start_date ASC");
        $stmt->execute();
        $this->respond($stmt->fetchAll());
    }

    public function registrants($classId) {
        $stmt = $this->db->prepare("SELECT registered_users FROM classes WHERE class_id = ?");
        $stmt->execute([$classId]);
        $class = $stmt->fetch();
        
        if (!$class) {
            return $this->failNotFound('Class not found.');
        }

        $registeredEmails = json_decode($class['registered_users'], true);
        if (!is_array($registeredEmails) || empty($registeredEmails)) {
            return $this->respond([]);
        }

        $placeholders = implode(',', array_fill(0, count($registeredEmails), '?'));
        $sql = "SELECT name, email, phone, roles FROM users WHERE email IN ($placeholders)";
        $stmtUsers = $this->db->prepare($sql);
        $stmtUsers->execute($registeredEmails);
        
        $this->respond($stmtUsers->fetchAll());
    }

    public function evaluations($classId) {
        $sql = "SELECT u.name, u.roles, e.score_content, e.score_material, e.score_duration, e.score_format, e.score_speaker, e.comments 
                FROM evaluations e 
                JOIN users u ON e.user_email = u.email 
                WHERE e.class_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$classId]);
        $results = $stmt->fetchAll();

        if (empty($results)) {
            return $this->respond(['evaluations' => [], 'suggestions' => []]);
        }

        $evaluations = [];
        $suggestions = [];

        foreach ($results as $r) {
            $r['user_roles'] = json_decode($r['roles'], true) ?: [];
            $evaluations[] = $r;
            if (!empty($r['comments'])) {
                $suggestions[] = $r['comments'];
            }
        }
        $this->respond(['evaluations' => $evaluations, 'suggestions' => $suggestions]);
    }

    public function register($classId) {
        $this->authenticate();
        $this->db->beginTransaction();
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM classes WHERE class_id = ? FOR UPDATE");
            $stmt->execute([$classId]);
            $class = $stmt->fetch();

            if (!$class) {
                $this->db->rollBack();
                return $this->failNotFound('Class not found.');
            }

            $registeredUsers = json_decode($class['registered_users'], true) ?: [];

            if ($class['max_participants'] != 999 && count($registeredUsers) >= $class['max_participants']) {
                $this->db->rollBack();
                return $this->failResourceExists('This class is already full.');
            }

            if (in_array($this->user->email, $registeredUsers)) {
                $this->db->rollBack();
                return $this->failResourceExists('You are already registered for this class.');
            }

            $registeredUsers[] = $this->user->email;
            
            $updateStmt = $this->db->prepare("UPDATE classes SET registered_users = ? WHERE class_id = ?");
            $updateStmt->execute([json_encode($registeredUsers), $classId]);

            $this->logActivity(0, $this->user->name, $this->user->email, 'REGISTER_CLASS', 'CLASS', $classId, ['class_title' => $class['title']]);
            
            $this->db->commit();
            
            // Email sending logic omitted for brevity, add EmailService integration later.
            $emailService = new EmailService();
            $emailService->sendRegistrationConfirmation($this->user->email, $class, $this->user->name);
            
            $this->respond(['message' => 'ลงทะเบียนสำเร็จแล้ว']);
            
        } catch (\Exception $e) {
            $this->db->rollBack();
            $this->fail('Database error', 500);
        }
    }
}
