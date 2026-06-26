<?php

namespace App\Controllers;
use App\Database;

class EvaluationController extends BaseController {
    
    public function userStatus() {
        $user = $this->authenticate();
        $stmt = $this->db->prepare("SELECT DISTINCT class_id FROM evaluations WHERE user_email = ?");
        $stmt->execute([$user->email]);
        $results = $stmt->fetchAll();
        $classIds = array_column($results, 'class_id');
        $this->respond($classIds);
    }

    public function create() {
        $user = $this->authenticate();
        $input = json_decode(file_get_contents('php://input'), true);

        $class_id = $input['class_id'] ?? null;
        $score_content = $input['score_content'] ?? null;
        $score_material = $input['score_material'] ?? null;
        $score_duration = $input['score_duration'] ?? null;
        $score_format = $input['score_format'] ?? null;
        $score_speaker = $input['score_speaker'] ?? null;
        $comment = $input['comment'] ?? null;

        if (!$class_id || $score_content === null) {
            http_response_code(400);
            $this->respond(['error' => 'Missing required evaluation data.']);
            return;
        }

        $stmt = $this->db->prepare("SELECT evaluation_id FROM evaluations WHERE class_id = ? AND user_email = ?");
        $stmt->execute([$class_id, $user->email]);
        if ($stmt->fetch()) {
            http_response_code(409);
            $this->respond(['error' => 'You have already submitted an evaluation for this class.']);
            return;
        }

        $sql = "INSERT INTO evaluations (class_id, user_email, score_content, score_material, score_duration, score_format, score_speaker, comments)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt2 = $this->db->prepare($sql);
        $stmt2->execute([
            $class_id, $user->email, $score_content, $score_material,
            $score_duration, $score_format, $score_speaker, $comment
        ]);

        $this->logActivity(0, $user->name, $user->email, 'SUBMIT_EVALUATION', 'CLASS', $class_id, ['class_id' => $class_id]);

        http_response_code(201);
        $this->respond(['message' => 'Evaluation submitted successfully.']);
    }
}
