<?php

namespace App;

use App\Controllers\AuthController;
use App\Controllers\ClassController;
use App\Controllers\FormController;
use App\Controllers\StatsController;
use App\Controllers\UserController;

class Router {
    public function handle($method, $uri) {
        $parts = explode('/', trim($uri, '/'));
        // Example: /api/classes -> parts: api, classes
        
        $resource = $parts[1] ?? '';
        $id = $parts[2] ?? null;
        $subResource = $parts[3] ?? null;

        header('Content-Type: application/json');

        try {
            switch ($resource) {
                case 'auth':
                    $controller = new AuthController();
                    if ($id === 'login') {
                        $controller->login();
                    } else if ($id === 'callback') {
                        $controller->callback();
                    } else {
                        $this->notFound();
                    }
                    break;

                case 'classes':
                    $controller = new ClassController();
                    if ($method === 'GET' && $id === 'promoted') {
                        $controller->promoted();
                    } else if ($method === 'GET' && $id === 'unique-titles') {
                        $controller->uniqueTitles();
                    } else if ($method === 'GET' && $id && $subResource === 'registrants') {
                        $controller->registrants($id);
                    } else if ($method === 'GET' && $id && $subResource === 'evaluations') {
                        $controller->evaluations($id);
                    } else if ($method === 'GET' && $id) {
                        $controller->show($id);
                    } else if ($method === 'GET') {
                        $controller->index();
                    } else if ($method === 'POST' && $id && $subResource === 'register') {
                        $controller->register($id);
                    } else if ($method === 'POST' && $id && $subResource === 'evaluate') {
                        $controller->evaluate($id);
                    } else if ($method === 'POST') {
                        $controller->create();
                    } else if ($method === 'PUT' && $id && $subResource === 'promote') {
                        $controller->promote($id);
                    } else if ($method === 'PUT' && $id && $subResource === 'close') {
                        $controller->close($id);
                    } else if ($method === 'PUT' && $id) {
                        $controller->update($id);
                    } else if ($method === 'DELETE' && $id && $subResource === 'cancel') {
                        $controller->cancelRegistration($id);
                    } else if ($method === 'DELETE' && $id) {
                        $controller->delete($id);
                    } else {
                        $this->notFound();
                    }
                    break;

                case 'forms':
                    $controller = new FormController();
                    if ($method === 'GET') {
                        $controller->index();
                    } else if ($method === 'POST') {
                        $controller->create();
                    } else if ($method === 'PUT' && $id && $subResource === 'approve') {
                        $controller->approve($id);
                    } else if ($method === 'PUT' && $id && $subResource === 'reject') {
                        $controller->reject($id);
                    } else if ($method === 'PUT' && $id && $subResource === 'resubmit') {
                        $controller->resubmit($id);
                    } else if ($method === 'PUT' && $id) {
                        $controller->update($id);
                    } else if ($method === 'DELETE' && $id) {
                        $controller->delete($id);
                    } else {
                        $this->notFound();
                    }
                    break;

                case 'statistics':
                    $controller = new StatsController();
                    if ($method === 'GET' && $id === 'class-demographics') {
                        $controller->classDemographics();
                    } else {
                        $this->notFound();
                    }
                    break;

                case 'users':
                    $controller = new UserController();
                    if ($method === 'GET') {
                        $controller->index();
                    } else if ($method === 'POST') {
                        $controller->create();
                    } else if ($method === 'PUT' && $id) {
                        $controller->update($id);
                    } else if ($method === 'DELETE' && $id) {
                        $controller->delete($id);
                    } else {
                        $this->notFound();
                    }
                    break;

                default:
                    $this->notFound();
                    break;
            }
        } catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Internal Server Error", "message" => $e->getMessage()]);
        }
    }

    private function notFound() {
        http_response_code(404);
        echo json_encode(["error" => "Route not found"]);
    }
}
