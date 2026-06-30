<?php

namespace App\Filters;

use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Filters\FilterInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $header = $request->getHeaderLine('Authorization');
        if (empty($header) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $header = $_SERVER['HTTP_AUTHORIZATION'];
        }
        $token = null;

        if (!empty($header)) {
            if (preg_match('/Bearer\s(\S+)/', $header, $matches)) {
                $token = $matches[1];
            }
        }

        if (!$token) {
            return \Config\Services::response()
                ->setJSON(['error' => 'Unauthorized'])
                ->setStatusCode(401);
        }

        try {
            $key = $_ENV['JWT_SECRET'] ?? 'amscmu5071_PROD_SECURE_KEY';
            $decoded = JWT::decode($token, new Key($key, 'HS256'));
            
            // Attach user data to request so controllers can use it
            // CodeIgniter doesn't have a direct $request->user like Express
            // But we can store it in a global or register it in a service/singleton, 
            // or pass it via custom header for the controller to pick up.
            // A simple way in CI4 is to store it in the $_SERVER or define a constant, 
            // but the cleaner way is to store it in the request body or header.
            // Let's store it in $_SERVER for easy access across the app.
            $_SERVER['user'] = (array) $decoded;
            
        } catch (Exception $ex) {
            return \Config\Services::response()
                ->setJSON(['error' => 'Invalid or expired token'])
                ->setStatusCode(401);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Do nothing
    }
}
