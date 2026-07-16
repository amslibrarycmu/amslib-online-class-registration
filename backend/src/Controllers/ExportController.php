<?php

namespace App\Controllers;

use App\Database;
use PDO;
use Exception;

class ExportController extends BaseController {

    public function exportClasses() {
        try {
            $pdo = Database::getConnection();

            $stmt = $pdo->query("SELECT id, class_id, title, start_date, start_time, end_time, speaker, format, status FROM classes ORDER BY start_date DESC");
            $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Set headers to force download as CSV
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="classes_export.csv"');

            // Open output stream
            $output = fopen('php://output', 'w');

            // Write UTF-8 BOM for Excel compatibility
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

            // Write headers
            if (count($classes) > 0) {
                fputcsv($output, array_keys($classes[0]), ',', '"', "\\");
            } else {
                fputcsv($output, ['id', 'class_id', 'title', 'start_date', 'start_time', 'end_time', 'speaker', 'format', 'status'], ',', '"', "\\");
            }

            // Write data rows
            foreach ($classes as $row) {
                fputcsv($output, $row, ',', '"', "\\");
            }

            fclose($output);
            exit;

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }
}
