<?php
session_start();
if (!isset($_SESSION["logged_in"]) || !$_SESSION["logged_in"]) {
    http_response_code(403);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Forbidden"]);
    exit;
}
$maxBytes = 5 * 1024 * 1024;
$uploadsDir = realpath(__DIR__ . "/../uploads");
if ($uploadsDir === false) {
    $uploadsDir = __DIR__ . "/../uploads";
    if (!@mkdir($uploadsDir, 0755, true) && !is_dir($uploadsDir)) {
        http_response_code(500);
        header("Content-Type: application/json");
        echo json_encode(["error" => "Uploads directory missing"]);
        exit;
    }
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

if (!isset($_FILES["file"]) || !is_uploaded_file($_FILES["file"]["tmp_name"])) {
    http_response_code(400);
    header("Content-Type: application/json");
    echo json_encode(["error" => "No file uploaded"]);
    exit;
}

if ($_FILES["file"]["size"] > $maxBytes) {
    http_response_code(413);
    header("Content-Type: application/json");
    echo json_encode(["error" => "File too large"]);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($_FILES["file"]["tmp_name"]);
if ($mime === false || strpos($mime, "image/") !== 0) {
    http_response_code(400);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Only images allowed"]);
    exit;
}

$originalName = $_FILES["file"]["name"] ?? "image";
$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
$base = pathinfo($originalName, PATHINFO_FILENAME);
$base = preg_replace('/[^a-zA-Z0-9_-]+/', "-", $base);
$base = trim($base, "-");
if ($base === "") {
    $base = "image";
}

$filename = $base . "-" . time();
if ($ext !== "") {
    $filename .= "." . $ext;
}

$targetPath = $uploadsDir . DIRECTORY_SEPARATOR . $filename;
if (!@move_uploaded_file($_FILES["file"]["tmp_name"], $targetPath)) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Could not save file"]);
    exit;
}

$scheme = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "https" : "http";
$host = $_SERVER["HTTP_HOST"] ?? "localhost";
$location = $scheme . "://" . $host . "/uploads/" . $filename;

header("Content-Type: application/json");
echo json_encode(["location" => $location]);
