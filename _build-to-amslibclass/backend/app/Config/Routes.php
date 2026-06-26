<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

$routes->get('api/test-db', 'Api\Users::testDb');

$routes->group('api', ['namespace' => 'App\Controllers\Api', 'filter' => 'cors'], function($routes) {
    
    // --- Classes Routes ---
    $routes->group('classes', function($routes) {
        $routes->get('', 'Classes::index', ['filter' => 'auth']);
        $routes->get('unique-titles', 'Classes::uniqueTitles');
        $routes->get('promoted', 'Classes::promoted');
        $routes->get('(:segment)/registrants', 'Classes::registrants/$1', ['filter' => ['auth', 'admin:1']]);
        $routes->post('', 'Classes::create', ['filter' => ['auth', 'admin:1']]);
        $routes->post('(:segment)', 'Classes::update/$1', ['filter' => ['auth', 'admin:1']]);
        $routes->delete('(:segment)', 'Classes::delete/$1', ['filter' => ['auth', 'admin:1']]);
        $routes->post('(:segment)/register', 'Classes::register/$1', ['filter' => 'auth']);
        $routes->post('(:segment)/cancel', 'Classes::cancel/$1', ['filter' => 'auth']);
        $routes->get('registered/closed', 'Classes::registeredClosed', ['filter' => 'auth']);
        $routes->post('(:segment)/close', 'Classes::closeClass/$1', ['filter' => ['auth', 'admin:1']]);
        $routes->put('(:segment)/promote', 'Classes::promote/$1', ['filter' => ['auth', 'admin:1']]);
        $routes->get('(:segment)/evaluations', 'Classes::evaluations/$1', ['filter' => ['auth', 'admin:1']]);
    });
    
    // --- Requests Routes ---
    $routes->group('requests', ['filter' => 'auth'], function($routes) {
        $routes->get('', 'Requests::index');
        $routes->post('', 'Requests::create');
        $routes->put('(:segment)', 'Requests::update/$1');
        $routes->delete('(:segment)', 'Requests::delete/$1');
    });
    
    // --- Evaluations Routes ---
    $routes->group('evaluations', ['filter' => 'auth'], function($routes) {
        $routes->get('user-status', 'Evaluations::userStatus');
        $routes->post('', 'Evaluations::create');
    });
    $routes->group('auth', function($routes) {
        $routes->get('login', 'Auth::login');
        $routes->get('callback', 'Auth::callback');
        $routes->post('complete-registration', 'Auth::completeRegistration');
    });
    
    // --- Admin Routes ---
    $routes->group('admin', ['filter' => 'auth'], function($routes) {
        $routes->get('activity-logs', 'Admin::activityLogs', ['filter' => 'admin:3']);
        $routes->get('activity-logs/all', 'Admin::activityLogsAll', ['filter' => 'admin:3']);
        $routes->get('class-requests', 'Admin::classRequests', ['filter' => 'admin:2']);
        $routes->post('class-requests/(:segment)', 'Admin::handleClassRequest/$1', ['filter' => 'admin:2']);
        $routes->get('statistics/class-demographics', 'Admin::classDemographics', ['filter' => 'admin:2']);
        
        $routes->get('topics', 'Admin::topics', ['filter' => 'admin:3']);
        $routes->post('topics', 'Admin::createTopic', ['filter' => 'admin:3']);
        $routes->put('topics/(:segment)', 'Admin::updateTopic/$1', ['filter' => 'admin:3']);
        $routes->delete('topics/(:segment)', 'Admin::deleteTopic/$1', ['filter' => 'admin:3']);
    });
    $routes->group('users', ['filter' => 'auth'], function($routes) {
        $routes->get('me', 'Users::me');
        $routes->get('search', 'Users::search', ['filter' => 'admin:3']);
        $routes->get('admins', 'Users::admins', ['filter' => 'admin:3']);
        $routes->post('admins/appoint', 'Users::appointAdmin', ['filter' => 'admin:3']);
        $routes->put('admins/(:num)/level', 'Users::updateAdminLevel/$1', ['filter' => 'admin:3']);
        $routes->delete('admins/(:num)', 'Users::removeAdmin/$1', ['filter' => 'admin:3']);
        $routes->get('/', 'Users::index', ['filter' => 'admin:3']);
        $routes->get('(:num)', 'Users::show/$1', ['filter' => 'admin:1']);
        // The remaining update/delete routes can be added here
    });

});
