<?php
/* Sai Inn contact API. POST /api/contact.php stores a message. */

require_once __DIR__ . "/helpers.php";

if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST") {
    fail("Method not allowed.", 405);
}

if (rate_limited("contact:" . client_ip(), 8, 3600)) {
    fail("Too many attempts. Please try again later.", 429);
}
if (!referer_ok()) {
    fail("Request rejected.");
}

$data = body_fields();
if (!honeypot_ok($data)) {
    respond(["ok" => true]);
}

$name = clean_text($data["name"] ?? "", 80);
$email = clean_text($data["email"] ?? "", 120);
$subject = clean_text($data["subject"] ?? "", 120);
$body = clean_text($data["msg"] ?? "", 2000);

if ($name === "" || $body === "") {
    fail("Please add your name and a message.");
}
if (!valid_email($email)) {
    fail("That email address does not look right.");
}

$stmt = db()->prepare("INSERT INTO messages (name, email, subject, body) VALUES (?, ?, ?, ?)");
$stmt->execute([$name, $email, $subject, $body]);

respond(["ok" => true]);
