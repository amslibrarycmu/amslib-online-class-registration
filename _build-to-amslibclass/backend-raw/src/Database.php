<?php

namespace App;

use PDO;
use PDOException;

class Database {
    private static $instance = null;

    public static function getConnection() {
        if (self::$instance === null) {
            $host = $_ENV['DB_HOST'] ?? 'localhost';
            $db   = $_ENV['DB_DATABASE'] ?? 'library_amslibclass';
            $user = $_ENV['DB_USER'] ?? 'root';
            $pass = $_ENV['DB_PASSWORD'] ?? '';
            $port = $_ENV['DB_PORT'] ?? '3306';
            $charset = 'utf8mb4';

            $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
            } catch (PDOException $e) {
                // Return a generic error to avoid leaking credentials
                http_response_code(500);
                echo json_encode(["error" => "Database connection failed"]);
                exit;
            }
        }
        return self::$instance;
    }
}
