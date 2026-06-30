<?php

namespace App\Controllers;

class StatsController extends BaseController {

    public function classDemographics() {
        $this->authenticate();
        $year = $_GET['year'] ?? 'all';
        $month = $_GET['month'] ?? 'all';

        $params = [];
        $conditions = ["c.status = 'closed'"];

        if ($year !== 'all') {
            $conditions[] = "YEAR(c.start_date) = ?";
            $params[] = $year;
        }

        if ($month !== 'all') {
            $conditions[] = "MONTH(c.start_date) = ?";
            $params[] = $month;
        }

        $whereClause = implode(" AND ", $conditions);

        $sql = "
            SELECT 
                c.class_id, 
                c.title, 
                c.start_date,
                (SELECT COUNT(*) FROM evaluations e WHERE e.class_id = c.class_id) as total_evaluations,
                (SELECT AVG(score_content) FROM evaluations e WHERE e.class_id = c.class_id) as avg_score_content,
                (SELECT AVG(score_material) FROM evaluations e WHERE e.class_id = c.class_id) as avg_score_material,
                (SELECT AVG(score_duration) FROM evaluations e WHERE e.class_id = c.class_id) as avg_score_duration,
                (SELECT AVG(score_format) FROM evaluations e WHERE e.class_id = c.class_id) as avg_score_format,
                (SELECT AVG(score_speaker) FROM evaluations e WHERE e.class_id = c.class_id) as avg_score_speaker,
                c.registered_users
            FROM classes c
            WHERE $whereClause
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $classes = $stmt->fetchAll();

        // Parse demographics
        foreach ($classes as &$class) {
            $registeredEmails = json_decode($class['registered_users'], true) ?: [];
            $demographics = [];
            
            if (!empty($registeredEmails)) {
                $placeholders = implode(',', array_fill(0, count($registeredEmails), '?'));
                $userSql = "SELECT roles FROM users WHERE email IN ($placeholders)";
                $userStmt = $this->db->prepare($userSql);
                $userStmt->execute($registeredEmails);
                $users = $userStmt->fetchAll();

                foreach ($users as $u) {
                    $roles = json_decode($u['roles'], true) ?: [];
                    $status = (in_array("Admin", $roles) || in_array("Teacher", $roles)) ? "อาจารย์" : "นักศึกษา/บุคคลทั่วไป";
                    
                    if (!isset($demographics[$status])) {
                        $demographics[$status] = 0;
                    }
                    $demographics[$status]++;
                }
            }
            $class['demographics'] = $demographics;
            unset($class['registered_users']);
        }

        $this->respond($classes);
    }
}
