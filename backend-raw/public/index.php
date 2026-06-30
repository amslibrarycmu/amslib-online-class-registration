<?php

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

// Load environment variables
if (file_exists(__DIR__ . '/../.env.local')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..', '.env.local');
    $dotenv->safeLoad();
}
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Simple Router
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Handle base path (e.g. /amslibclass/backend-raw/public/api/classes)
$basePath = '/api'; // We expect endpoints to start with /api
$uri = str_replace('/library/amslibclass/backend/public', '', $uri); // Strip directory path if any
$uri = str_replace('/amslibclass/backend-raw/public', '', $uri); // For local testing
// Basic routing
if (strpos($uri, '/api/') === 0) {
    // API Route
    require_once __DIR__ . '/../src/Router.php';
    $router = new App\Router();
    $router->handle($method, $uri);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint Not Found', 'path' => $uri]);
}
