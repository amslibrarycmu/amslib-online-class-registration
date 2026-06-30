<?php

namespace App\Controllers;

class EmailService {
    public function sendRegistrationConfirmation($email, $class, $userName) {
        $subject = "ยืนยันการลงทะเบียนเรียน: " . $class['title'];
        $message = "เรียนคุณ $userName,\n\n";
        $message .= "ระบบได้รับข้อมูลการลงทะเบียนเรียนของคุณสำหรับห้องเรียน \"{$class['title']}\" เรียบร้อยแล้ว\n\n";
        $message .= "ข้อมูลห้องเรียน:\n";
        $message .= "- วันที่เปิดสอน: " . date('d/m/Y', strtotime($class['start_date'])) . "\n";
        $message .= "- เวลา: {$class['start_time']} - {$class['end_time']}\n";
        $message .= "- ลิงก์สำหรับเข้าร่วม: " . ($class['join_link'] ?? 'รอประกาศเพิ่มเติม') . "\n\n";
        $message .= "ขอบคุณที่ให้ความสนใจครับ/ค่ะ";
        
        $this->sendEmail($email, $subject, $message);
    }
    
    private function sendEmail($to, $subject, $message) {
        $headers = "From: " . ($_ENV['EMAIL_FROM_ADDRESS'] ?? 'noreply@cmu.ac.th') . "\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        
        // Use PHP's built-in mail function
        @mail($to, $subject, $message, $headers);
    }
}
