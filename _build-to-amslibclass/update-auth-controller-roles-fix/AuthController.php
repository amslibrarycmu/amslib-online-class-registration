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

        // Determine Role
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT roles FROM users WHERE email = ? AND is_active = 1");
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        
        $roles = [];
        $status = "นักศึกษา/บุคคลทั่วไป";

        if ($row && !empty($row['roles'])) {
            $dbRoles = json_decode($row['roles'], true);
            if (is_array($dbRoles)) {
                $roles = $dbRoles;
                if (in_array('ผู้ดูแลระบบ', $roles) || in_array('Admin', $roles)) {
                    $status = "ผู้ดูแลระบบ";
                } else if (in_array('บุคลากร', $roles) || in_array('Teacher', $roles)) {
                    $status = "บุคลากร";
                }
            } else {
                $roles = [$row['roles']];
            }
        }


        // Fetch full user data to pass back
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $fullUser = $stmt->fetch();
        
        $userData = [
            'id' => $fullUser['id'] ?? null,
            'name' => $displayName,
            'email' => $email,
            'roles' => $roles,
            'status' => $status,
            'profile_completed' => $fullUser['profile_completed'] ?? 0,
            'admin_level' => 0
        ];
        
        // Generate our JWT
        $payload = [
            "iss" => $_ENV['BACKEND_URL'],
            "aud" => $_ENV['FRONTEND_URL'],
            "iat" => time(),
            "exp" => time() + (8 * 3600), // 8 hours
            "email" => $email,
            "name" => $displayName,
            "roles" => $roles,
            "status" => $status,
            "profile_completed" => $fullUser['profile_completed'] ?? 0
        ];

        $jwt = JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');

        $frontendUrl = $_ENV['FRONTEND_URL'];
        $userJson = urlencode(json_encode($userData));
        header("Location: $frontendUrl/login?token=$jwt&user=$userJson");
        exit;
    }
}
