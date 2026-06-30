<?php

namespace App;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class AuthHelper {
    public static function authenticate() {
        $headers = getallheaders();
        $authHeader = null;

        // Find Authorization header (case insensitive)
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
                $authHeader = $value;
                break;
            }
        }

        if (!$authHeader) {
            // Check SERVER variable (Apache might pass it here)
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
        }

        if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            http_response_code(401);
            echo json_encode(["error" => "Unauthorized"]);
            exit;
        }

        $token = $matches[1];
        $secret = $_ENV['JWT_SECRET'];

        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            return $decoded;
        } catch (Exception $e) {
            http_response_code(401);
            echo json_encode(["error" => "Invalid Token"]);
            exit;
        }
    }

    public static function requireAdmin($user) {
        if (!isset($user->roles) || !in_array("Admin", $user->roles)) {
            http_response_code(403);
            echo json_encode(["error" => "Forbidden"]);
            exit;
        }
    }
}
