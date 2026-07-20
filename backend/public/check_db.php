<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../src/config/database.php';
$pdo = getDB();
$stmt = $pdo->query("
    SELECT cr.requested_by_name, cr.requested_by_email, u1.id as requested_by_id, u1.email as u1_email
    FROM class_requests cr
    LEFT JOIN users u1 ON cr.requested_by_email = u1.email
");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
