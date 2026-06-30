<?php

namespace App\Controllers;

class StatsController extends BaseController {

    public function classDemographics() {
        $this->authenticate();
        $filterType = $_GET['filterType'] ?? 'all';
        $year = $_GET['year'] ?? null;
        $month = $_GET['month'] ?? null;
        $startDate = $_GET['startDate'] ?? null;
        $endDate = $_GET['endDate'] ?? null;

        $params = [];
        $conditions = ["c.status != 'draft'", "c.status != 'open'"];

        if ($filterType === 'yearly' && $year) {
            $conditions[] = "YEAR(c.start_date) = ?";
            $params[] = $year;
        } else if ($filterType === 'monthly' && $year && $month) {
            $conditions[] = "YEAR(c.start_date) = ?";
            $conditions[] = "MONTH(c.start_date) = ?";
            $params[] = $year;
            $params[] = $month;
        } else if ($filterType === 'range') {
            if (!empty($startDate)) {
                $conditions[] = "c.start_date >= ?";
                $params[] = $startDate;
            }
            if (!empty($endDate)) {
                $conditions[] = "c.start_date <= ?";
                $params[] = $endDate;
            }
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

        $rolesToFilterStr = $_GET['roles'] ?? '[]';
        $rolesToFilter = json_decode($rolesToFilterStr, true) ?: [];

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

                    if (!is_array($roles)) {
                        $roles = [];
                    }

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
                            if ($r !== "ผู้ดูแลระบบ") {
                                $displayRole = $r;
                                break;
                            }
                        }
                    }

                    $status = $displayRole ?: (!empty($roles) ? $roles[0] : "ไม่ระบุ");
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
