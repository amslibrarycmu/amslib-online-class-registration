<?php

namespace App\Controllers;

use App\Database;
use PDO;
use Exception;

class CronController extends BaseController {
    
    public function sendReminders() {
        // Validate Token
        $token = $_GET['token'] ?? null;
        $secret = $_ENV['CRON_SECRET'] ?? 'default-secret-key-please-change';
        
        if ($token !== $secret) {
            http_response_code(403);
            $this->respond(['error' => 'Unauthorized Access']);
            return;
        }
        
        try {
            $pdo = Database::getConnection();

            // Get classes starting tomorrow
            $tomorrow = date('Y-m-d', strtotime('+1 day'));
            $stmt = $pdo->prepare("SELECT * FROM classes WHERE start_date = ? AND status = 'open'");
            $stmt->execute([$tomorrow]);
            $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($classes)) {
                $this->respond(['message' => 'No classes starting tomorrow.']);
                return;
            }

            $emailService = new EmailService();
            $notifiedUsers = 0;
            $classSummary = [];

            foreach ($classes as $class) {
                $registeredEmails = json_decode($class['registered_users'] ?? '[]', true) ?: [];
                if (empty($registeredEmails)) {
                    continue;
                }

                $placeholders = implode(',', array_fill(0, count($registeredEmails), '?'));
                // Prevent sending to duplicate emails in case of bugs
                $stmtUsers = $pdo->prepare("SELECT name, email FROM users WHERE email IN ($placeholders) GROUP BY email");
                $stmtUsers->execute($registeredEmails);
                $users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);

                $sentForThisClass = 0;
                foreach ($users as $user) {
                    $emailService->sendClassReminder($user['email'], $class, $user['name']);
                    $sentForThisClass++;
                    $notifiedUsers++;
                }
                
                $classSummary[] = [
                    'class_id' => $class['class_id'],
                    'title' => $class['title'],
                    'reminders_sent' => $sentForThisClass
                ];
            }

            $this->respond([
                'success' => true,
                'message' => "Successfully sent reminders to $notifiedUsers users.",
                'total_classes' => count($classes),
                'details' => $classSummary
            ]);

        } catch (Exception $e) {
            error_log("Cron Reminder Error: " . $e->getMessage());
            http_response_code(500);
            $this->respond(['error' => $e->getMessage()]);
        }
    }
}
