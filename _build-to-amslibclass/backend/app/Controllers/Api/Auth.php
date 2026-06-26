<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use Firebase\JWT\JWT;

class Auth extends ResourceController
{
    protected $format = 'json';
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    private function logActivity($userId, $userName, $userEmail, $action, $targetType, $targetId, $details = [])
    {
        $request = \Config\Services::request();
        $ip = $request->getIPAddress();
        $userAgent = $request->getUserAgent()->getAgentString();

        $data = [
            'user_id' => $userId,
            'user_name' => $userName,
            'user_email' => $userEmail,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'details' => json_encode($details),
            'ip_address' => $ip,
            'user_agent' => $userAgent,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $this->db->table('activity_logs')->insert($data);
    }

    // GET /api/auth/login
    public function login()
    {
        $tenantId = $_ENV['MS_ENTRA_ID_TENANT_ID'];
        $clientId = $_ENV['MS_ENTRA_ID_CLIENT_ID'];
        $redirectUri = $_ENV['MS_ENTRA_ID_REDIRECT_URI'];
        
        $scopes = "openid profile email User.Read";
        
        $authUrl = "https://login.microsoftonline.com/{$tenantId}/oauth2/v2.0/authorize?" . http_build_query([
            'client_id' => $clientId,
            'response_type' => 'code',
            'redirect_uri' => $redirectUri,
            'scope' => $scopes,
            'response_mode' => 'query'
        ]);

        return $this->response->redirect($authUrl);
    }

    // GET /api/auth/callback
    public function callback()
    {
        $error = $this->request->getGet('error');
        $errorDescription = $this->request->getGet('error_description');
        $code = $this->request->getGet('code');
        
        $frontendUrl = $_ENV['FRONTEND_URL'] ?? "http://localhost:5173";

        if ($error) {
            $msg = urlencode($errorDescription ?: 'Authentication failed');
            return $this->response->redirect("{$frontendUrl}/login?error={$msg}");
        }

        $tenantId = $_ENV['MS_ENTRA_ID_TENANT_ID'];
        $clientId = $_ENV['MS_ENTRA_ID_CLIENT_ID'];
        $clientSecret = $_ENV['MS_ENTRA_ID_CLIENT_SECRET'];
        $redirectUri = $_ENV['MS_ENTRA_ID_REDIRECT_URI'];

        // Request Access Token
        $client = \Config\Services::curlrequest();
        try {
            $tokenResponse = $client->request('POST', "https://login.microsoftonline.com/{$tenantId}/oauth2/v2.0/token", [
                'form_params' => [
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'code' => $code,
                    'redirect_uri' => $redirectUri,
                    'grant_type' => 'authorization_code',
                    'scope' => 'openid profile email User.Read'
                ]
            ]);

            $tokenData = json_decode($tokenResponse->getBody());
            $accessToken = $tokenData->access_token;
            
            // Get user profile from MS Graph
            $graphResponse = $client->request('GET', 'https://graph.microsoft.com/v1.0/me', [
                'headers' => [
                    'Authorization' => "Bearer {$accessToken}"
                ]
            ]);
            
            $graphData = json_decode($graphResponse->getBody());

            $email = $graphData->mail ?? $graphData->userPrincipalName ?? '';
            $name = $graphData->displayName ?? 'Unknown User';

            // Check if user exists in database
            $sql = "
                SELECT u.*, ap.admin_level 
                FROM users u
                LEFT JOIN admin_permissions ap ON u.id = ap.user_id
                WHERE u.email = ?
            ";
            $query = $this->db->query($sql, [$email]);
            $user = $query->getRowArray();

            $jwtSecret = $_ENV['JWT_SECRET'];

            if ($user) {
                // Existing User Flow
                $roles = json_decode($user['roles'], true);
                if (!is_array($roles)) $roles = [];

                $jwtPayload = [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'name' => $user['name'],
                    'roles' => $roles,
                    'admin_level' => $user['admin_level'],
                    'profile_completed' => (bool)$user['profile_completed'],
                    'photo' => $user['photo']
                ];
                
                // Add exp inside payload manually as array merging
                $jwtPayload['exp'] = time() + (24 * 60 * 60); // 1 day

                $appToken = JWT::encode($jwtPayload, $jwtSecret, 'HS256');

                $this->logActivity(
                    $user['id'],
                    $user['name'],
                    $user['email'],
                    'LOGIN_SUCCESS',
                    'USER',
                    $user['id']
                );

                $tokenParam = urlencode($appToken);
                return $this->response->redirect("{$frontendUrl}/login-callback?token={$tokenParam}");
            } else {
                // New User Flow
                $tempPayload = [
                    'email' => $email,
                    'name' => $name,
                    'is_temporary' => true,
                    'exp' => time() + (15 * 60) // 15 mins
                ];
                
                $tempToken = JWT::encode($tempPayload, $jwtSecret, 'HS256');
                return $this->response->redirect("{$frontendUrl}/login-callback?temp_token={$tempToken}");
            }
            
        } catch (\Exception $e) {
            log_message('error', 'MSAL Login Error: ' . $e->getMessage());
            $msg = urlencode("Error during authentication");
            return $this->response->redirect("{$frontendUrl}/login?error={$msg}");
        }
    }

    // POST /api/auth/complete-registration
    public function completeRegistration()
    {
        $tempToken = $this->request->getVar('temp_token');
        $roles = $this->request->getVar('roles') ?? [];
        $phone = $this->request->getVar('phone');
        $pdpa = $this->request->getVar('pdpa');

        if (!$tempToken) {
            return $this->failUnauthorized('Missing temporary token.');
        }

        try {
            $jwtSecret = $_ENV['JWT_SECRET'];
            $decoded = (array) JWT::decode($tempToken, new \Firebase\JWT\Key($jwtSecret, 'HS256'));
            
            if (empty($decoded['is_temporary'])) {
                return $this->failForbidden('Invalid token type.');
            }

            $email = $decoded['email'];
            $name = $decoded['name'];

            $query = $this->db->query("SELECT id FROM users WHERE email = ?", [$email]);
            if ($query->getRowArray()) {
                return $this->failResourceExists('User already exists.');
            }

            $newUser = [
                'email' => $email,
                'name' => $name,
                'original_name' => $name,
                'roles' => json_encode(is_array($roles) ? $roles : []),
                'phone' => $phone ?: null,
                'pdpa' => $pdpa ? 1 : 0,
                'is_active' => 1,
                'profile_completed' => 1
            ];

            $this->db->table('users')->insert($newUser);
            $newUserId = $this->db->insertID();

            $this->logActivity(
                $newUserId,
                $name,
                $email,
                'REGISTER_USER',
                'USER',
                $newUserId,
                ['source' => 'CMU_OAUTH']
            );

            $finalPayload = [
                'id' => $newUserId,
                'email' => $email,
                'name' => $name,
                'roles' => is_array($roles) ? $roles : [],
                'profile_completed' => true,
                'admin_level' => null,
                'photo' => null,
                'exp' => time() + (24 * 60 * 60)
            ];

            $finalToken = JWT::encode($finalPayload, $jwtSecret, 'HS256');

            return $this->respondCreated([
                'message' => 'User registered successfully.',
                'token' => $finalToken,
                'user' => $finalPayload
            ]);

        } catch (\Exception $e) {
            if (strpos($e->getMessage(), 'Expired') !== false) {
                return $this->failUnauthorized('Registration session expired. Please log in again.');
            }
            return $this->failServerError('Server error during registration.');
        }
    }
}
