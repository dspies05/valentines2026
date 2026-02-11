<?php
session_start();
if (!isset($_SESSION["logged_in"]) || !$_SESSION["logged_in"]) {
    http_response_code(403);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Forbidden"]);
    exit;
}
$storagePath = realpath(__DIR__ . "/../data/pages.json");
if ($storagePath === false) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Pages storage missing"]);
    exit;
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if ($method === "GET") {
    $data = @file_get_contents($storagePath);
    if ($data === false) {
        http_response_code(500);
        header("Content-Type: application/json");
        echo json_encode(["error" => "Could not read pages"]);
        exit;
    }

    header("Content-Type: application/json");
    echo $data;
    exit;
}

if ($method === "PUT") {
    $raw = file_get_contents("php://input");
    $payload = json_decode($raw, true);

    if (!is_array($payload)) {
        http_response_code(400);
        header("Content-Type: application/json");
        echo json_encode(["error" => "Invalid JSON"]);
        exit;
    }

    $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        http_response_code(500);
        header("Content-Type: application/json");
        echo json_encode(["error" => "Could not encode pages"]);
        exit;
    }

    $result = @file_put_contents($storagePath, $encoded, LOCK_EX);
    if ($result === false) {
        http_response_code(500);
        header("Content-Type: application/json");
        echo json_encode(["error" => "Sorry, could not write data"]);
        exit;
    }

    header("Content-Type: application/json");
    echo json_encode(["success" => true]);
    exit;
}

http_response_code(405);
header("Content-Type: application/json");
echo json_encode(["error" => "Method not allowed"]);
