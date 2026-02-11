<?php
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
$password = "";

if (!is_array($data) || !isset($data["password"])) {
    http_response_code(400);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Password required"]);
    exit;
}

if ($data["password"] === $password) {
    session_start();
    $_SESSION["logged_in"] = true;
    header("Content-Type: application/json");
    echo json_encode(["status" => "success"]);
    exit;
}
http_response_code(403);
header("Content-Type: application/json");
echo json_encode(["error" => "Forbidden"]);
