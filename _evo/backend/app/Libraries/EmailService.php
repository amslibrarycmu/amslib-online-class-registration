<?php

namespace App\Libraries;

class EmailService
{
    protected $email;
    protected $backendUrl;

    public function __construct()
    {
        $this->email = \Config\Services::email();
        $this->backendUrl = $_ENV['BACKEND_URL'] ?? 'http://localhost:8080';
    }

    private function loadTemplate($templateName, $data)
    {
        $templatePath = APPPATH . 'Views/emails/' . $templateName . '.php';
        if (!file_exists($templatePath)) {
            log_message('error', 'Email template not found: ' . $templatePath);
            return '';
        }

        $html = file_get_contents($templatePath);
        foreach ($data as $key => $value) {
            $html = str_replace('{{' . $key . '}}', $value, $html);
        }
        return $html;
    }

    private function createMaterialsSection($materialsJson)
    {
        $materials = [];
        if (is_string($materialsJson)) {
            $materials = json_decode($materialsJson, true) ?: [];
        } elseif (is_array($materialsJson)) {
            $materials = $materialsJson;
        }

        if (empty($materials)) {
            return '';
        }

        $materialLinks = '';
        foreach ($materials as $material) {
            $name = is_array($material) ? ($material['name'] ?? '') : $material;
            $encodedName = urlencode($name);
            $materialLinks .= "<li><a href=\"{$this->backendUrl}/uploads/materials/{$encodedName}\">{$name}</a></li>";
        }

        return "
            <p><strong>เอกสารประกอบการเรียน:</strong></p>
            <ul>{$materialLinks}</ul>
        ";
    }

    private function sendEmail($to, $subject, $htmlContent)
    {
        $this->email->clear();
        
        $fromEmail = $_ENV['EMAIL_FROM_ADDRESS'] ?? 'noreply@example.com';
        $fromName = 'ระบบจัดการการอบรมเชิงปฏิบัติการ AMS Library Class';
        
        $this->email->setFrom($fromEmail, $fromName);
        $this->email->setTo($to);
        $this->email->setSubject($subject);
        $this->email->setMessage($htmlContent);
        
        // CI4 sets mailType 'html' from config or we can force it:
        $this->email->setMailType('html');

        if ($this->email->send()) {
            log_message('info', "Email sent successfully to {$to} - Subject: {$subject}");
            return true;
        } else {
            log_message('error', "Failed to send email to {$to} - Error: " . $this->email->printDebugger(['headers']));
            return false;
        }
    }

    public function sendRegistrationConfirmation($recipientEmail, $classDetails, $studentName)
    {
        // $classDetails object/array parsing
        $title = $classDetails['title'] ?? '';
        $desc = $classDetails['description'] ?? '';
        $format = $classDetails['format'] ?? '';
        $joinLink = $classDetails['join_link'] ?? '';
        $location = $classDetails['location'] ?? '';

        // Safely parse dates
        $startDate = !empty($classDetails['start_date']) ? date('j F Y', strtotime($classDetails['start_date'])) : '';
        $endDate = !empty($classDetails['end_date']) ? date('j F Y', strtotime($classDetails['end_date'])) : '';
        
        $speaker = $classDetails['speaker'] ?? '';
        if (is_string($speaker)) {
            $speakerArr = json_decode($speaker, true);
            if (is_array($speakerArr)) {
                $speaker = implode(', ', $speakerArr);
            }
        }

        $templateData = [
            'studentName' => $studentName,
            'classTitle' => $title,
            'classDescription' => $desc ? "<p style=\"font-style: italic; color: #555;\">{$desc}</p>" : "",
            'classId' => $classDetails['class_id'] ?? '',
            'classSpeaker' => $speaker,
            'classStartDate' => $startDate,
            'classEndDate' => $endDate,
            'classStartTime' => substr($classDetails['start_time'] ?? '', 0, 5),
            'classEndTime' => substr($classDetails['end_time'] ?? '', 0, 5),
            'classFormat' => $format,
            'classLanguage' => $classDetails['language'] ?? '-',
            'classTargetGroup' => $classDetails['target_groups'] ?? '-',
            'classLinkSection' => $format !== 'ONSITE' && $joinLink ? "<p><strong>ลิงก์เข้าร่วม:</strong> <a href=\"{$joinLink}\">{$joinLink}</a></p>" : "",
            'classLocationSection' => $format !== 'ONLINE' && $location ? "<p><strong>สถานที่:</strong> {$location}</p>" : "",
            'classMaterialsSection' => $this->createMaterialsSection($classDetails['materials'] ?? '[]'),
        ];

        $htmlContent = $this->loadTemplate('registration-confirmation', $templateData);
        $this->sendEmail($recipientEmail, "ยืนยันการลงทะเบียน {$title}", $htmlContent);
    }

    public function sendAdminNotification($adminEmails, $classDetails, $allRegisteredUsers, $newRegistrant)
    {
        if (empty($adminEmails)) return;

        $userListHtml = '';
        foreach ($allRegisteredUsers as $user) {
            $name = $user['name'] ?? '';
            $email = $user['email'] ?? '';
            $userListHtml .= "<li>{$name} ({$email})</li>";
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
        $to = implode(', ', $adminEmails);
        $title = $classDetails['title'] ?? '';
        $this->sendEmail($to, "[ระบบแจ้งเตือน] มีผู้ลงทะเบียนใหม่ในห้องเรียน ชื่อ {$title}", $htmlContent);
    }

    public function sendAdminCancellationNotification($adminEmails, $studentName, $studentEmail, $classDetails, $remainingUsers)
    {
        if (empty($adminEmails)) return;

        $userListHtml = '';
        foreach ($remainingUsers as $user) {
            $name = $user['name'] ?? '';
            $email = $user['email'] ?? '';
            $userListHtml .= "<li>{$name} ({$email})</li>";
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
        $to = implode(', ', $adminEmails);
        $title = $classDetails['title'] ?? '';
        $this->sendEmail($to, "[ระบบแจ้งเตือน] มีผู้ยกเลิกลงทะเบียนจากห้องเรียน ชื่อ {$title}", $htmlContent);
    }

    public function sendNewClassRequestAdminNotification($adminEmails, $requestDetails)
    {
        if (empty($adminEmails)) return;

        $templateData = [
            'requestTitle' => $requestDetails['title'] ?? 'ไม่มีชื่อเรื่อง',
            'requesterName' => $requestDetails['requestedBy']['name'] ?? 'ไม่พบชื่อ',
            'requesterEmail' => $requestDetails['requestedBy']['email'] ?? 'ไม่พบอีเมล',
            'requestReason' => $requestDetails['reason'] ?? "-",
            'requestDate' => date('j F Y'),
        ];

        $htmlContent = $this->loadTemplate('admin-new-request', $templateData);
        $to = implode(', ', $adminEmails);
        $title = $requestDetails['title'] ?? '';
        $this->sendEmail($to, "[ระบบแจ้งเตือน] มีคำขอเปิดห้องเรียนใหม่ ชื่อ \"{$title}\"", $htmlContent);
    }

    public function sendRequestSubmittedConfirmation($recipientEmail, $requestDetails, $requesterName)
    {
        $templateData = [
            'requesterName' => $requesterName,
            'requestTitle' => $requestDetails['title'] ?? '',
        ];
        $htmlContent = $this->loadTemplate('request-submitted', $templateData);
        $title = $requestDetails['title'] ?? '';
        $this->sendEmail($recipientEmail, "ได้รับคำขอเปิดห้องเรียนของคุณแล้ว: {$title}", $htmlContent);
    }

    public function sendRequestApprovedNotification($recipientEmail, $requestDetails)
    {
        $templateData = [
            'requesterName' => $requestDetails['requested_by_name'] ?? $requestDetails['user_email'] ?? '',
            'requestTitle' => $requestDetails['title'] ?? '',
        ];
        $htmlContent = $this->loadTemplate('request-approved', $templateData);
        $title = $requestDetails['title'] ?? '';
        $this->sendEmail($recipientEmail, "แจ้งผลการพิจารณาคำขอหลักสูตร {$title} \"ได้รับการอนุมัติแล้ว\"", $htmlContent);
    }

    public function sendRequestRejectedNotification($recipientEmail, $requestDetails, $rejectionReason)
    {
        $templateData = [
            'requesterName' => $requestDetails['requested_by_name'] ?? $requestDetails['user_email'] ?? '',
            'requestTitle' => $requestDetails['title'] ?? '',
            'rejectionReasonSection' => $rejectionReason ? "<p><strong>เหตุผล:</strong> {$rejectionReason}</p>" : "",
        ];
        $htmlContent = $this->loadTemplate('request-rejected', $templateData);
        $title = $requestDetails['title'] ?? '';
        $this->sendEmail($recipientEmail, "แจ้งผลการพิจารณาคำขอหลักสูตร: {$title} \"ไม่ได้รับการอนุมัติ\"", $htmlContent);
    }
}
