<?php

namespace App\Controllers;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class EmailService {

    private function sendEmail($to, $subject, $htmlContent) {
        $mail = new PHPMailer(true);
        
        try {
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = $_ENV['EMAIL_AUTH_USER'] ?? ''; 
            $mail->Password   = $_ENV['EMAIL_AUTH_PASS'] ?? '';
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = 587;
            $mail->CharSet    = 'UTF-8';

            $fromEmail = $_ENV['EMAIL_FROM_ADDRESS'] ?? 'noreply@cmu.ac.th';
            $mail->setFrom($fromEmail, 'AMSLIB Online Class');

            $recipients = array_map('trim', explode(',', $to));
            foreach ($recipients as $recipient) {
                if (!empty($recipient)) {
                    $mail->addAddress($recipient);
                }
            }

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $htmlContent;

            $mail->send();
        } catch (Exception $e) {
            error_log("Message could not be sent. Mailer Error: {$mail->ErrorInfo}");
        }
    }

    private function loadTemplate($templateName, $data) {
        $templatePath = __DIR__ . '/../templates/' . $templateName . '.html';
        if (!file_exists($templatePath)) {
            return "<p>Email template not found.</p>";
        }
        
        $html = file_get_contents($templatePath);
        foreach ($data as $key => $value) {
            
            if (is_array($value) || is_object($value)) {
                continue;
            }
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
            'classTitle' => $classDetails['title'] ?? '',
            'classDescription' => !empty($classDetails['description']) ? "<p style=\"font-style: italic; color: #555;\">{$classDetails['description']}</p>" : "",
            'classId' => $classDetails['class_id'] ?? '',
            'classSpeaker' => is_string($classDetails['speaker']) ? (json_decode($classDetails['speaker'], true)[0] ?? '-') : ($classDetails['speaker'][0] ?? '-'),
            'classStartDate' => date('d M Y', strtotime($classDetails['start_date'] ?? 'now')),
            'classEndDate' => date('d M Y', strtotime($classDetails['end_date'] ?? 'now')),
            'classStartTime' => substr($classDetails['start_time'] ?? '', 0, 5),
            'classEndTime' => substr($classDetails['end_time'] ?? '', 0, 5),
            'classFormat' => $classDetails['format'] ?? '',
            'classLanguage' => $classDetails['language'] ?? "-",
            'classTargetGroup' => is_string($classDetails['target_groups'] ?? '') ? (json_decode($classDetails['target_groups'], true)[0] ?? '-') : (($classDetails['target_groups'] ?? [''])[0] ?? '-'),
            'classLinkSection' => ($classDetails['format'] ?? '') !== "ONSITE" ? "<p><strong>ลิงก์เข้าร่วม:</strong> <a href=\"" . ($classDetails['join_link'] ?? '') . "\">" . ($classDetails['join_link'] ?? '') . "</a></p>" : "",
            'classLocationSection' => ($classDetails['format'] ?? '') !== "ONLINE" ? "<p><strong>สถานที่:</strong> " . ($classDetails['location'] ?? '') . "</p>" : "",
            'classMaterialsSection' => $this->createMaterialsSection($classDetails['materials'] ?? [], $backendUrl),
        ];

        $htmlContent = $this->loadTemplate('registration-confirmation', $templateData);
        $subject = "ยืนยันการลงทะเบียน " . ($classDetails['title'] ?? '');

        $this->sendEmail($recipientEmail, $subject, $htmlContent);
    }

    public function sendAdminNotification($adminEmails, $classDetails, $allRegisteredUsers, $newRegistrant) {
        if (empty($adminEmails)) return;

        $userListHtml = "";
        foreach ($allRegisteredUsers as $user) {
            $userListHtml .= "<li>{$user['name']} ({$user['email']})</li>";
        }

        $templateData = [
            'classTitle' => $classDetails['title'] ?? '',
            'classId' => $classDetails['class_id'] ?? '',
            'newRegistrantName' => $newRegistrant['name'] ?? '',
            'newRegistrantEmail' => $newRegistrant['email'] ?? '',
            'registrantCount' => count($allRegisteredUsers),
            'userListHtml' => $userListHtml,
        ];

        $htmlContent = $this->loadTemplate('admin-new-registrant', $templateData);
        $subject = "[ระบบแจ้งเตือน] มีผู้ลงทะเบียนใหม่ในห้องเรียน ชื่อ " . ($classDetails['title'] ?? '');

        $this->sendEmail(implode(', ', $adminEmails), $subject, $htmlContent);
    }

    public function sendAdminCancellationNotification($adminEmails, $studentName, $studentEmail, $classDetails, $remainingUsers) {
        if (empty($adminEmails)) return;

        $userListHtml = "";
        foreach ($remainingUsers as $user) {
            $userListHtml .= "<li>{$user['name']} ({$user['email']})</li>";
        }

        $templateData = [
            'classTitle' => $classDetails['title'] ?? '',
            'classId' => $classDetails['class_id'] ?? '',
            'cancelingUserName' => $studentName,
            'cancelingUserEmail' => $studentEmail,
            'remainingUserCount' => count($remainingUsers),
            'userListHtml' => $userListHtml,
        ];

        $htmlContent = $this->loadTemplate('admin-cancellation', $templateData);
        $subject = "[ระบบแจ้งเตือน] มีผู้ยกเลิกลงทะเบียนจากห้องเรียน ชื่อ " . ($classDetails['title'] ?? '');

        $this->sendEmail(implode(', ', $adminEmails), $subject, $htmlContent);
    }

    public function sendNewClassRequestAdminNotification($adminEmails, $requestDetails) {
        if (empty($adminEmails)) return;

        $templateData = [
            'requestTitle' => $requestDetails['title'] ?? 'ไม่มีชื่อเรื่อง',
            'requesterName' => $requestDetails['requested_by_name'] ?? 'ไม่พบชื่อ',
            'requesterEmail' => $requestDetails['user_email'] ?? 'ไม่พบอีเมล',
            'requestReason' => $requestDetails['reason'] ?? "-",
            'requestDate' => date('d M Y'),
        ];

        $htmlContent = $this->loadTemplate('admin-new-request', $templateData);
        $subject = "[ระบบแจ้งเตือน] มีคำขอเปิดห้องเรียนใหม่ ชื่อ \"" . ($requestDetails['title'] ?? '') . "\"";

        $this->sendEmail(implode(', ', $adminEmails), $subject, $htmlContent);
    }

    public function sendRequestSubmittedConfirmation($recipientEmail, $requestDetails, $requesterName) {
        $templateData = [
            'requesterName' => $requesterName,
            'requestTitle' => $requestDetails['title'] ?? '',
        ];
        
        $htmlContent = $this->loadTemplate('request-submitted', $templateData);
        $subject = "ได้รับคำขอเปิดห้องเรียนของคุณแล้ว: " . ($requestDetails['title'] ?? '');

        $this->sendEmail($recipientEmail, $subject, $htmlContent);
    }

    public function sendRequestApprovedNotification($recipientEmail, $requestDetails) {
        $templateData = [
            'requesterName' => $requestDetails['requested_by_name'] ?? $requestDetails['user_email'],
            'requestTitle' => $requestDetails['title'] ?? '',
        ];
        
        $htmlContent = $this->loadTemplate('request-approved', $templateData);
        $subject = "แจ้งผลการพิจารณาคำขอหลักสูตร " . ($requestDetails['title'] ?? '') . " \"ได้รับการอนุมัติแล้ว\"";

        $this->sendEmail($recipientEmail, $subject, $htmlContent);
    }

    public function sendRequestRejectedNotification($recipientEmail, $requestDetails, $rejectionReason) {
        $templateData = [
            'requesterName' => $requestDetails['requested_by_name'] ?? $requestDetails['user_email'],
            'requestTitle' => $requestDetails['title'] ?? '',
            'rejectionReasonSection' => !empty($rejectionReason) ? "<p><strong>เหตุผล:</strong> {$rejectionReason}</p>" : "",
        ];
        
        $htmlContent = $this->loadTemplate('request-rejected', $templateData);
        $subject = "แจ้งผลการพิจารณาคำขอหลักสูตร: " . ($requestDetails['title'] ?? '') . " \"ไม่ได้รับการอนุมัติ\"";

        $this->sendEmail($recipientEmail, $subject, $htmlContent);
    }

}
