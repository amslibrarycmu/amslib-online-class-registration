<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

if (file_exists(__DIR__ . '/../.env.local')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..', '.env.local');
    $dotenv->safeLoad();
}
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

$basePath = '/api'; 
$uri = str_replace('/library/amslibclass/backend/public', '', $uri); 
$uri = str_replace('/amslibclass/backend-raw/public', '', $uri); 

if (strpos($uri, '/api/') === 0) {
    
    require_once __DIR__ . '/../src/Router.php';
    $router = new App\Router();
    $router->handle($method, $uri);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint Not Found', 'path' => $uri]);
}
