<?php

namespace App;

class EmailService {

    private function sendEmail($to, $subject, $htmlContent) {
        $from = $_ENV['EMAIL_FROM_ADDRESS'] ?? 'noreply@ams.cmu.ac.th';
        
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= "From: ระบบจัดการการอบรมเชิงปฏิบัติการ AMS Library Class <" . $from . ">" . "\r\n";

        // In a real environment, using PHPMailer is recommended.
        // For simplicity and to avoid composer dependencies, we use mail()
        return mail($to, $subject, $htmlContent, $headers);
    }

    private function loadTemplate($templateName, $data) {
        $templatePath = __DIR__ . '/../../backend-nodejs-backup/templates/' . $templateName . '.html';
        if (!file_exists($templatePath)) {
            // fallback if nodejs backup folder is not there, we should copy templates to backend-raw/templates
            $templatePath = __DIR__ . '/../templates/' . $templateName . '.html';
            if (!file_exists($templatePath)) {
                return "<p>Email template not found.</p>";
            }
        }
        
        $html = file_get_contents($templatePath);
        foreach ($data as $key => $value) {
            $html = str_replace('{{' . $key . '}}', $value, $html);
        }
        return $html;
    }

    private function createMaterialsSection($materialsJson, $backendUrl) {
        $materials = [];
        if (is_string($materialsJson)) {
            $materials = json_decode($materialsJson, true) ?: [];
        } else if (is_array($materialsJson)) {
            $materials = $materialsJson;
        }

        if (empty($materials)) {
            return "";
        }

        $materialLinks = "";
        foreach ($materials as $material) {
            $name = is_array($material) ? ($material['name'] ?? '') : $material;
            $encodedName = rawurlencode($name);
            $materialLinks .= "<li><a href=\"$backendUrl/uploads/materials/$encodedName\">$name</a></li>";
        }

        return "
            <p><strong>เอกสารประกอบการเรียน:</strong></p>
            <ul>$materialLinks</ul>
        ";
    }

    public function sendRegistrationConfirmation($recipientEmail, $classDetails, $studentName) {
        $backendUrl = $_ENV['BACKEND_URL'] ?? '';

        $templateData = [
            'studentName' => $studentName,
            'classTitle' => $classDetails['title'],
            'classDescription' => !empty($classDetails['description']) ? "<p style=\"font-style: italic; color: #555;\">{$classDetails['description']}</p>" : "",
            'classId' => $classDetails['class_id'],
            'classSpeaker' => $classDetails['speaker'],
            'classStartDate' => date('d M Y', strtotime($classDetails['start_date'])),
            'classEndDate' => date('d M Y', strtotime($classDetails['end_date'])),
            'classStartTime' => substr($classDetails['start_time'], 0, 5),
            'classEndTime' => substr($classDetails['end_time'], 0, 5),
            'classFormat' => $classDetails['format'],
            'classLanguage' => $classDetails['language'] ?? "-",
            'classTargetGroup' => $classDetails['target_group'] ?? "-",
            'classLinkSection' => $classDetails['format'] !== "ONSITE" ? "<p><strong>ลิงก์เข้าร่วม:</strong> <a href=\"{$classDetails['join_link']}\">{$classDetails['join_link']}</a></p>" : "",
            'classLocationSection' => $classDetails['format'] !== "ONLINE" ? "<p><strong>สถานที่:</strong> {$classDetails['location']}</p>" : "",
            'classMaterialsSection' => $this->createMaterialsSection($classDetails['materials'], $backendUrl),
        ];

        $htmlContent = $this->loadTemplate('registration-confirmation', $templateData);
        $subject = "ยืนยันการลงทะเบียน {$classDetails['title']}";

        $this->sendEmail($recipientEmail, $subject, $htmlContent);
    }
    
    // Other functions can be ported similarly, left out for brevity unless specifically needed.
}
