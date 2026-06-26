<?php

namespace App\Controllers;

use App\Database;
use App\AuthHelper;
use Firebase\JWT\JWT;

class AuthController {

    public function login() {
        $clientId = $_ENV['MS_ENTRA_ID_CLIENT_ID'];
        $tenantId = $_ENV['MS_ENTRA_ID_TENANT_ID'];
        $redirectUri = $_ENV['MS_ENTRA_ID_REDIRECT_URI'];
        $scope = "openid profile email User.Read";
        
        $loginUrl = "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/authorize?" . http_build_query([
            'client_id' => $clientId,
            'response_type' => 'code',
            'redirect_uri' => $redirectUri,
            'response_mode' => 'query',
            'scope' => $scope,
            'state' => 'amslib_auth'
        ]);

        header("Location: " . $loginUrl);
        exit;
    }

    public function callback() {
        if (!isset($_GET['code'])) {
            $frontendUrl = $_ENV['FRONTEND_URL'];
            header("Location: $frontendUrl/login?error=auth_failed");
            exit;
        }

        $code = $_GET['code'];
        $tenantId = $_ENV['MS_ENTRA_ID_TENANT_ID'];
        $clientId = $_ENV['MS_ENTRA_ID_CLIENT_ID'];
        $clientSecret = $_ENV['MS_ENTRA_ID_CLIENT_SECRET'];
        $redirectUri = $_ENV['MS_ENTRA_ID_REDIRECT_URI'];

        // Get Access Token
        $tokenUrl = "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $tokenUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'client_id' => $clientId,
            'scope' => 'User.Read',
            'code' => $code,
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
            'client_secret' => $clientSecret
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        curl_close($ch);

        $tokenData = json_decode($response, true);
        
        if (!isset($tokenData['access_token'])) {
            $frontendUrl = $_ENV['FRONTEND_URL'];
            header("Location: $frontendUrl/login?error=token_failed");
            exit;
        }

        // Get User Profile
        $graphUrl = "https://graph.microsoft.com/v1.0/me";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $graphUrl);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $tokenData['access_token'],
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $graphResponse = curl_exec($ch);
        curl_close($ch);

        $userProfile = json_decode($graphResponse, true);
        if (!isset($userProfile['mail'])) {
            $frontendUrl = $_ENV['FRONTEND_URL'];
            header("Location: $frontendUrl/login?error=profile_failed");
            exit;
        }

        $email = $userProfile['mail'];
        $displayName = $userProfile['displayName'] ?? '';

        // Check if user exists in database
        $pdo = Database::getConnection();
        $userQuery = "SELECT u.*, ap.admin_level FROM users u LEFT JOIN admin_permissions ap ON u.id = ap.user_id WHERE u.email = ?";
        $stmt = $pdo->prepare($userQuery);
        $stmt->execute([$email]);
        $fullUser = $stmt->fetch();
        
        $frontendUrl = rtrim($_ENV['FRONTEND_URL'], '/');

        if ($fullUser) {
            // Existing User Flow
            $roles = [];
            if (!empty($fullUser['roles'])) {
                $dbRoles = json_decode($fullUser['roles'], true);
                if (is_array($dbRoles)) {
                    $roles = $dbRoles;
                } else {
                    $roles = [$fullUser['roles']];
                }
            }

            $payload = [
                "id" => $fullUser['id'],
                "email" => $fullUser['email'],
                "name" => $fullUser['name'],
                "roles" => $roles,
                "admin_level" => $fullUser['admin_level'],
                "profile_completed" => !empty($fullUser['profile_completed']),
                "photo" => $fullUser['photo'] ?? null,
                "iss" => $_ENV['BACKEND_URL'],
                "aud" => $_ENV['FRONTEND_URL'],
                "iat" => time(),
                "exp" => time() + (24 * 3600) // 1 day
            ];
            $jwt = JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');
            
            // Note: In PHP we log activity here if we had the logActivity function, for now we skip or implement it later.
            
            header("Location: $frontendUrl/login-callback?token=" . urlencode($jwt));
            exit;
        } else {
            // New User Flow
            $tempPayload = [
                "email" => $email,
                "name" => $displayName,
                "is_temporary" => true,
                "iss" => $_ENV['BACKEND_URL'],
                "aud" => $_ENV['FRONTEND_URL'],
                "iat" => time(),
                "exp" => time() + (15 * 60) // 15 mins
            ];
            $tempToken = JWT::encode($tempPayload, $_ENV['JWT_SECRET'], 'HS256');
            
            header("Location: $frontendUrl/login-callback?temp_token=" . urlencode($tempToken));
            exit;
        }
    }

    public function completeRegistration() {
        $input = json_decode(file_get_contents('php://input'), true);
        $temp_token = $input['temp_token'] ?? null;
        $roles = $input['roles'] ?? [];
        $phone = $input['phone'] ?? null;
        $pdpa = !empty($input['pdpa']) ? 1 : 0;

        if (!$temp_token) {
            http_response_code(401);
            echo json_encode(['message' => 'Missing temporary token.']);
            return;
        }

        try {
            $decoded = JWT::decode($temp_token, new \Firebase\JWT\Key($_ENV['JWT_SECRET'], 'HS256'));
            if (empty($decoded->is_temporary)) {
                http_response_code(403);
                echo json_encode(['message' => 'Invalid token type.']);
                return;
            }

            $email = $decoded->email;
            $name = $decoded->name;

            $pdo = Database::getConnection();
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['message' => 'User already exists.']);
                return;
            }

            $sql = "INSERT INTO users (email, name, original_name, roles, phone, pdpa, is_active, profile_completed) VALUES (?, ?, ?, ?, ?, ?, 1, 1)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $email,
                $name,
                $name,
                json_encode($roles),
                $phone,
                $pdpa
            ]);
            
            $newUserId = $pdo->lastInsertId();

            $finalPayload = [
                "id" => $newUserId,
                "email" => $email,
                "name" => $name,
                "roles" => $roles,
                "profile_completed" => true,
                "admin_level" => null,
                "photo" => null,
                "iss" => $_ENV['BACKEND_URL'],
                "aud" => $_ENV['FRONTEND_URL'],
                "iat" => time(),
                "exp" => time() + (24 * 3600)
            ];
            $finalToken = JWT::encode($finalPayload, $_ENV['JWT_SECRET'], 'HS256');

            http_response_code(201);
            echo json_encode([
                'message' => 'User registered successfully.',
                'token' => $finalToken,
                'user' => $finalPayload
            ]);

        } catch (\Exception $e) {
            http_response_code(401);
            echo json_encode(['message' => 'Invalid or expired token.', 'error' => $e->getMessage()]);
        }
    }
}
