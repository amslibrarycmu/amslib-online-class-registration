<?php
require 'vendor/autoload.php';
use Firebase\JWT\JWT;
$payload = ['id'=>1, 'email'=>'admin@example.com', 'admin_level'=>3];
echo JWT::encode($payload, 'amscmu5071_PROD_SECURE_KEY', 'HS256');
