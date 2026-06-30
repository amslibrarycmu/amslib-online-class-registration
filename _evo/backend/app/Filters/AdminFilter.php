<?php

namespace App\Filters;

use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Filters\FilterInterface;

class AdminFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Must be called after AuthFilter, so $_SERVER['user'] is populated
        if (!isset($_SERVER['user'])) {
            return \Config\Services::response()
                ->setJSON(['error' => 'Unauthorized'])
                ->setStatusCode(401);
        }

        $user = $_SERVER['user'];
        $requiredLevel = isset($arguments[0]) ? (int) $arguments[0] : 1;
        $userAdminLevel = isset($user['admin_level']) ? (int) $user['admin_level'] : 0;

        if ($userAdminLevel < $requiredLevel) {
            return \Config\Services::response()
                ->setJSON(['error' => 'Forbidden: Insufficient admin level'])
                ->setStatusCode(403);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Do nothing
    }
}
