<?php

namespace App\Controllers;
use App\Database;

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
        $stmt = $this->db->prepare("SELECT admin_level FROM admin_permissions WHERE user_id = ?");
        $stmt->execute([$user->id]);
        $row = $stmt->fetch();
        $adminLevel = $row ? (int)$row['admin_level'] : 0;
        if (in_array('ผู้ดูแลระบบ', $user->roles ?? [])) $adminLevel = 3;

        if ($adminLevel > 0) {
            $stmt = $this->db->prepare("SELECT * FROM classes ORDER BY created_at DESC");
            $stmt->execute();
        } else {
            $stmt = $this->db->prepare("SELECT * FROM classes WHERE created_by_email = ? ORDER BY created_at DESC");
            $stmt->execute([$user->email]);
        }

        $results = $stmt->fetchAll();
        foreach($results as &$r) {
            if (is_string($r['materials'])) $r['materials'] = json_decode($r['materials'], true) ?: [];
            if (is_string($r['speaker'])) $r['speaker'] = json_decode($r['speaker'], true) ?: [];
            if (is_string($r['registered_users'])) $r['registered_users'] = json_decode($r['registered_users'], true) ?: [];
            if (is_string($r['target_groups'])) $r['target_groups'] = json_decode($r['target_groups'], true) ?: [];
        }
        $this->respond($results);
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
        $results = $stmt->fetchAll();
        foreach($results as &$r) {
            if (is_string($r['materials'])) $r['materials'] = json_decode($r['materials'], true) ?: [];
            if (is_string($r['speaker'])) $r['speaker'] = json_decode($r['speaker'], true) ?: [];
            if (is_string($r['registered_users'])) $r['registered_users'] = json_decode($r['registered_users'], true) ?: [];
            if (is_string($r['target_groups'])) $r['target_groups'] = json_decode($r['target_groups'], true) ?: [];
        }
        $this->respond($results);
    }

    public function show($id) {
        $stmt = $this->db->prepare("SELECT * FROM classes WHERE class_id = ?");
        $stmt->execute([$id]);
        $r = $stmt->fetch();
        if (!$r) {
            http_response_code(404);
            $this->respond(['error' => 'Not found']);
            return;
        }
        if (is_string($r['materials'])) $r['materials'] = json_decode($r['materials'], true) ?: [];
        if (is_string($r['speaker'])) $r['speaker'] = json_decode($r['speaker'], true) ?: [];
        if (is_string($r['registered_users'])) $r['registered_users'] = json_decode($r['registered_users'], true) ?: [];
        if (is_string($r['target_groups'])) $r['target_groups'] = json_decode($r['target_groups'], true) ?: [];
        $this->respond($r);
    }

    public function registeredClosed() {
        $user = $this->authenticate();
        $email = $user->email;
        $sql = "SELECT * FROM classes WHERE status = 'closed' AND JSON_CONTAINS(registered_users, ?)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['"' . $email . '"']);
        $this->respond($stmt->fetchAll());
    }

    public function registrants($classId) {
        $this->requireAdminLevel(1);
        $stmt = $this->db->prepare("SELECT registered_users FROM classes WHERE class_id = ?");
        $stmt->execute([$classId]);
        $class = $stmt->fetch();
        
        if (!$class) {
            http_response_code(404);
            $this->respond(['message' => 'Class not found.']);
            return;
        }

        $registeredEmails = json_decode($class['registered_users'], true) ?: [];
        if (!is_array($registeredEmails) || empty($registeredEmails)) {
            $this->respond([]);
            return;
        }

        $placeholders = implode(',', array_fill(0, count($registeredEmails), '?'));
        $sql = "SELECT name, email, phone, roles FROM users WHERE email IN ($placeholders)";
        $stmtUsers = $this->db->prepare($sql);
        $stmtUsers->execute($registeredEmails);
        
        $results = $stmtUsers->fetchAll();
        foreach($results as &$r) {
            if (is_string($r['roles'])) $r['roles'] = json_decode($r['roles'], true) ?: [];
        }
        $this->respond($results);
    }

    public function evaluations($classId) {
        $this->requireAdminLevel(1);
        $sql = "SELECT u.name, u.roles, e.score_content, e.score_material, e.score_duration, e.score_format, e.score_speaker, e.comments 
                FROM evaluations e 
                JOIN users u ON e.user_email = u.email 
                WHERE e.class_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$classId]);
        $results = $stmt->fetchAll();

        if (empty($results)) {
            $this->respond(['evaluations' => [], 'suggestions' => []]);
            return;
        }

        $evaluations = [];
        $suggestions = [];

        foreach ($results as $r) {
            $r['user_roles'] = is_string($r['roles']) ? json_decode($r['roles'], true) ?: [] : [];
            $evaluations[] = $r;
            if (!empty($r['comments'])) {
                $suggestions[] = $r['comments'];
            }
        }
        $this->respond(['evaluations' => $evaluations, 'suggestions' => $suggestions]);
    }

    public function create() {
        $user = $this->requireAdminLevel(1);
        
        $title = $_POST['title'] ?? '';
        $speaker = $_POST['speaker'] ?? '[]';
        $start_date = $_POST['start_date'] ?? null;
        $end_date = $_POST['end_date'] ?? null;
        $start_time = $_POST['start_time'] ?? null;
        $end_time = $_POST['end_time'] ?? null;
        $description = $_POST['description'] ?? '';
        $format = $_POST['format'] ?? null;
        $join_link = $_POST['join_link'] ?? null;
        $location = $_POST['location'] ?? '';
        $max_participants = $_POST['max_participants'] ?? null;
        $target_groups = $_POST['target_groups'] ?? '[]';
        $language = $_POST['language'] ?? 'TH';
        $request_id = $_POST['request_id'] ?? null;

        if (!$title) {
            http_response_code(400);
            $this->respond(['message' => 'Title is required.']);
            return;
        }

        $materialFileNames = [];
        if (isset($_FILES['files']) && is_array($_FILES['files']['name'])) {
            $uploadDir = __DIR__ . '/../../public/uploads/materials/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $fileCount = count($_FILES['files']['name']);
            for ($i = 0; $i < $fileCount; $i++) {
                if ($_FILES['files']['error'][$i] === UPLOAD_ERR_OK) {
                    $filename = time() . '-' . basename($_FILES['files']['name'][$i]);
                    move_uploaded_file($_FILES['files']['tmp_name'][$i], $uploadDir . $filename);
                    $materialFileNames[] = $filename;
                }
            }
        }

        $classId = $this->generateUniqueClassId();
        
        $sql = "INSERT INTO classes (class_id, title, speaker, start_date, end_date, start_time, end_time, description, format, join_link, location, max_participants, target_groups, materials, created_by_email, language) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $classId, $title, $speaker, $start_date, $end_date, $start_time, $end_time,
            $description, $format, $join_link, $location, $max_participants,
            $target_groups, json_encode($materialFileNames), $user->email, $language
        ]);
        
        $newId = $this->db->lastInsertId();

        if ($request_id && $request_id !== "null" && $request_id !== "undefined") {
            $stmt2 = $this->db->prepare("UPDATE class_requests SET status = 'completed' WHERE request_id = ?");
            $stmt2->execute([$request_id]);
        }

        http_response_code(201);
        $this->respond([
            'message' => 'Class created successfully',
            'classId' => $classId,
            'id' => $newId
        ]);
    }

    public function update($classId) {
        $user = $this->requireAdminLevel(1);
        
        $input = $_POST;
        if (empty($input)) {
            $input = json_decode(file_get_contents('php://input'), true) ?: [];
        }

        $stmt = $this->db->prepare("SELECT * FROM classes WHERE class_id = ?");
        $stmt->execute([$classId]);
        $existing = $stmt->fetch();
        if (!$existing) {
            http_response_code(404);
            $this->respond(['message' => 'Class not found.']);
            return;
        }

        $title = $input['title'] ?? $existing['title'];
        $speaker = $input['speaker'] ?? $existing['speaker'];
        $start_date = $input['start_date'] ?? $existing['start_date'];
        $end_date = $input['end_date'] ?? $existing['end_date'];
        $start_time = $input['start_time'] ?? $existing['start_time'];
        $end_time = $input['end_time'] ?? $existing['end_time'];
        $description = $input['description'] ?? $existing['description'];
        $format = $input['format'] ?? $existing['format'];
        $join_link = $input['join_link'] ?? $existing['join_link'];
        $location = $input['location'] ?? $existing['location'];
        $max_participants = $input['max_participants'] ?? $existing['max_participants'];
        $target_groups = $input['target_groups'] ?? $existing['target_groups'];
        $language = $input['language'] ?? $existing['language'];
        
        $existingMaterials = json_decode($existing['materials'], true) ?: [];
        $deletedMaterials = json_decode($input['deletedMaterials'] ?? '[]', true) ?: [];
        $remainingMaterials = array_values(array_filter($existingMaterials, function($m) use ($deletedMaterials) {
            return !in_array($m, $deletedMaterials);
        }));

        $newMaterials = [];
        if (isset($_FILES['newMaterials']) && is_array($_FILES['newMaterials']['name'])) {
            $uploadDir = __DIR__ . '/../../public/uploads/materials/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $fileCount = count($_FILES['newMaterials']['name']);
            for ($i = 0; $i < $fileCount; $i++) {
                if ($_FILES['newMaterials']['error'][$i] === UPLOAD_ERR_OK) {
                    $filename = time() . '-' . basename($_FILES['newMaterials']['name'][$i]);
                    move_uploaded_file($_FILES['newMaterials']['tmp_name'][$i], $uploadDir . $filename);
                    $newMaterials[] = $filename;
                }
            }
        }
        $finalMaterials = array_merge($remainingMaterials, $newMaterials);

        $sql = "UPDATE classes SET title=?, speaker=?, start_date=?, end_date=?, start_time=?, end_time=?, description=?, format=?, join_link=?, location=?, max_participants=?, target_groups=?, materials=?, language=? WHERE class_id=?";
        $stmt2 = $this->db->prepare($sql);
        $stmt2->execute([
            $title, $speaker, $start_date, $end_date, $start_time, $end_time,
            $description, $format, $join_link, $location, $max_participants,
            $target_groups, json_encode($finalMaterials), $language, $classId
        ]);

        foreach ($deletedMaterials as $delMat) {
            $path = __DIR__ . '/../../public/uploads/materials/' . $delMat;
            if (file_exists($path)) unlink($path);
        }

        $this->respond(['message' => 'Class updated successfully']);
    }

    public function promote($classId) {
        $user = $this->requireAdminLevel(2);
        $input = json_decode(file_get_contents('php://input'), true);
        $promoted = isset($input['promoted']) && $input['promoted'] ? 1 : 0;
        $stmt = $this->db->prepare("UPDATE classes SET promoted = ? WHERE class_id = ?");
        $stmt->execute([$promoted, $classId]);
        $this->respond(['message' => 'Promotion status updated successfully.']);
    }

    public function close($classId) {
        $user = $this->requireAdminLevel(1);
        $stmt = $this->db->prepare("UPDATE classes SET status = 'closed', promoted = FALSE WHERE class_id = ?");
        $stmt->execute([$classId]);
        $this->respond(['message' => 'Class closed successfully.']);
    }

    public function delete($classId) {
        $user = $this->requireAdminLevel(1);
        $stmt = $this->db->prepare("SELECT materials FROM classes WHERE class_id = ?");
        $stmt->execute([$classId]);
        $row = $stmt->fetch();
        if ($row && $row['materials']) {
            $mats = json_decode($row['materials'], true) ?: [];
            foreach ($mats as $m) {
                $path = __DIR__ . '/../../public/uploads/materials/' . $m;
                if (file_exists($path)) unlink($path);
            }
        }
        $stmt2 = $this->db->prepare("DELETE FROM classes WHERE class_id = ?");
        $stmt2->execute([$classId]);
        $this->respond(['message' => 'Class deleted successfully.']);
    }

    public function register($classId) {
        $user = $this->authenticate();
        $this->db->beginTransaction();
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM classes WHERE class_id = ? FOR UPDATE");
            $stmt->execute([$classId]);
            $class = $stmt->fetch();

            if (!$class) {
                $this->db->rollBack();
                http_response_code(404);
                $this->respond(['message' => 'Class not found.']);
                return;
            }

            $registeredUsers = json_decode($class['registered_users'], true) ?: [];

            if ($class['max_participants'] != 999 && count($registeredUsers) >= $class['max_participants']) {
                $this->db->rollBack();
                http_response_code(409);
                $this->respond(['message' => 'This class is already full.']);
                return;
            }

            if (in_array($user->email, $registeredUsers)) {
                $this->db->rollBack();
                http_response_code(409);
                $this->respond(['message' => 'You are already registered for this class.']);
                return;
            }

            $registeredUsers[] = $user->email;
            
            $updateStmt = $this->db->prepare("UPDATE classes SET registered_users = ? WHERE class_id = ?");
            $updateStmt->execute([json_encode($registeredUsers), $classId]);
            
            $this->db->commit();
            
            try {
                $emailService = new \App\Controllers\EmailService();
                $emailService->sendRegistrationConfirmation($user->email, $class, $user->name);
                
                $stmtAdmins = $this->db->query("SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')");
                $adminEmails = array_column($stmtAdmins->fetchAll(), 'email');
                
                if (!empty($adminEmails)) {
                    $placeholders = implode(',', array_fill(0, count($registeredUsers), '?'));
                    $stmtUsers = $this->db->prepare("SELECT name, email FROM users WHERE email IN ($placeholders)");
                    $stmtUsers->execute($registeredUsers);
                    $allRegisteredUsers = $stmtUsers->fetchAll();
                    
                    $emailService->sendAdminNotification($adminEmails, $class, $allRegisteredUsers, ['name' => $user->name, 'email' => $user->email]);
                }
            } catch (\Exception $e) {
                error_log("Failed to send email: " . $e->getMessage());
            }
            
            $this->respond(['message' => 'ลงทะเบียนสำเร็จแล้ว']);
            
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            $this->respond(['message' => 'Database error', 'error' => $e->getMessage()]);
        }
    }
    
    public function cancelRegistration($classId) {
        $user = $this->authenticate();
        $this->db->beginTransaction();
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM classes WHERE class_id = ? FOR UPDATE");
            $stmt->execute([$classId]);
            $class = $stmt->fetch();

            if (!$class) {
                $this->db->rollBack();
                http_response_code(404);
                $this->respond(['message' => 'Class not found.']);
                return;
            }

            $registeredUsers = json_decode($class['registered_users'], true) ?: [];
            
            if (!in_array($user->email, $registeredUsers)) {
                $this->db->rollBack();
                http_response_code(400);
                $this->respond(['message' => 'You are not registered for this class.']);
                return;
            }
            
            $registeredUsers = array_values(array_filter($registeredUsers, function($e) use ($user) {
                return $e !== $user->email;
            }));
            
            $updateStmt = $this->db->prepare("UPDATE classes SET registered_users = ? WHERE class_id = ?");
            $updateStmt->execute([json_encode($registeredUsers), $classId]);
            
            $this->db->commit();
            
            try {
                $emailService = new \App\Controllers\EmailService();
                
                $stmtAdmins = $this->db->query("SELECT email FROM users WHERE JSON_CONTAINS(roles, '\"ผู้ดูแลระบบ\"')");
                $adminEmails = array_column($stmtAdmins->fetchAll(), 'email');
                
                if (!empty($adminEmails)) {
                    $allRegisteredUsers = [];
                    if (!empty($registeredUsers)) {
                        $placeholders = implode(',', array_fill(0, count($registeredUsers), '?'));
                        $stmtUsers = $this->db->prepare("SELECT name, email FROM users WHERE email IN ($placeholders)");
                        $stmtUsers->execute($registeredUsers);
                        $allRegisteredUsers = $stmtUsers->fetchAll();
                    }
                    $emailService->sendAdminCancellationNotification($adminEmails, $user->name, $user->email, $class, $allRegisteredUsers);
                }
            } catch (\Exception $e) {
                error_log("Failed to send cancellation email: " . $e->getMessage());
            }
            
            $this->respond(['message' => 'ยกเลิกการลงทะเบียนสำเร็จ']);
        } catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            $this->respond(['message' => 'Database error', 'error' => $e->getMessage()]);
        }
    }
}
