<?php

namespace App;

use App\Controllers\AuthController;
use App\Controllers\ClassController;
use App\Controllers\FormController;
use App\Controllers\StatsController;
use App\Controllers\UserController;
use App\Controllers\RequestController;
use App\Controllers\AdminController;

class Router {
    public function handle($method, $uri) {
        $parts = explode('/', trim($uri, '/'));

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
                    } else if ($id === 'complete-registration' && $method === 'POST') {
                        $controller->completeRegistration();
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
                    } else if ($method === 'GET' && $id === 'registered' && $subResource === 'closed') {
                        $controller->registeredClosed();
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

                case 'requests':
                    $controller = new RequestController();
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
                    
                case 'evaluations':
                    $controller = new EvaluationController();
                    if ($method === 'GET' && $id === 'user-status') {
                        $controller->userStatus();
                    } else if ($method === 'POST') {
                        $controller->create();
                    } else {
                        $this->notFound();
                    }
                    break;
                    
                case 'log-activity':
                    $controller = new AdminController();
                    if ($method === 'POST') {
                        $controller->logActivityEndpoint();
                    } else {
                        $this->notFound();
                    }
                    break;
                    
                case 'admin':
                    if ($id === 'class-requests') {
                        $controller = new RequestController();
                        if ($method === 'GET') {
                            $controller->adminIndex();
                        } else if ($method === 'POST' && $subResource) {
                            $controller->adminProcess($subResource);
                        } else {
                            $this->notFound();
                        }
                    } else if ($id === 'activity-logs') {
                        $controller = new AdminController();
                        if ($method === 'GET') {
                            $controller->activityLogs();
                        } else {
                            $this->notFound();
                        }
                    } else if ($id === 'topics') {
                        $controller = new AdminController();
                        if ($method === 'GET') {
                            $controller->getTopics();
                        } else if ($method === 'POST') {
                            $controller->createTopic();
                        } else if ($method === 'PUT' && $subResource) {
                            $controller->updateTopic($subResource);
                        } else if ($method === 'DELETE' && $subResource) {
                            $controller->deleteTopic($subResource);
                        } else {
                            $this->notFound();
                        }
                    } else if ($id === 'classes') {
                        
                        $this->notFound();
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
                    if ($method === 'GET' && $id === 'me') {
                        $controller->me();
                    } else if ($method === 'GET' && $id === 'admins') {
                        $controller->admins();
                    } else if ($method === 'GET' && $id === 'search') {
                        $controller->search();
                    } else if ($method === 'POST' && $id === 'admins' && $subResource === 'appoint') {
                        $controller->appointAdmin();
                    } else if ($method === 'PUT' && $id === 'admins' && isset($parts[4]) && $parts[4] === 'level') {
                        $controller->updateAdminLevel($subResource); 
                    } else if ($method === 'DELETE' && $id === 'admins') {
                        $controller->revokeAdmin($subResource);
                    } else if ($method === 'GET' && $id === 'photo') {
                        $controller->getPhoto($subResource);
                    } else if ($method === 'GET' && $id) {
                        $controller->show($id);
                    } else if ($method === 'GET') {
                        $controller->index();
                    } else if ($method === 'PUT' && $id === 'update-profile') {
                        $controller->updateProfile();
                    } else if ($method === 'POST' && $id === 'profile-picture') {
                        $controller->uploadPhoto(); 
                    } else if ($method === 'DELETE' && $id === 'profile-picture') {
                        $controller->deletePhoto();
                    } else if ($method === 'PUT' && $id && $subResource === 'roles') {
                        $controller->updateRoles($id);
                    } else if ($method === 'PUT' && $id && $subResource === 'status') {
                        $controller->updateStatus($id);
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
