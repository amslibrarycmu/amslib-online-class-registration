<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$host = $_ENV['DB_HOST'] ?? '127.0.0.1';
$db   = $_ENV['DB_DATABASE'] ?? 'library';
$user = $_ENV['DB_USER'] ?? 'library';
$pass = $_ENV['DB_PASSWORD'] ?? 'T]znXIboIh-5rUKu';
$port = $_ENV['DB_PORT'] ?? '3306';

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Read the init.sql file
    $sqlFile = __DIR__ . '/init.sql';
    if (!file_exists($sqlFile)) {
        die("Error: init.sql file not found in " . __DIR__);
    }

    $sql = file_get_contents($sqlFile);
    
    // Execute the SQL queries
    $pdo->exec($sql);
    
    echo "<h1>Migration Successful!</h1>";
    echo "<p>All tables and mock data have been imported into the '$db' database.</p>";
    echo "<p><b>Important:</b> Please delete this <code>migrate.php</code> and <code>init.sql</code> from the server for security reasons.</p>";

} catch (PDOException $e) {
    die("Database Error: " . $e->getMessage());
} catch (Exception $e) {
    die("General Error: " . $e->getMessage());
}
