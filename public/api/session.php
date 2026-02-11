<?php
session_start();
if (!isset($_SESSION["logged_in"]) || !$_SESSION["logged_in"]) {
    http_response_code(403);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Forbidden"]);
    exit;
}
header("Content-Type: application/json");
echo json_encode(["status" => "success"]);
?>