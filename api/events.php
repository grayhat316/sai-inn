<?php
/* Sai Inn events API. POST /api/events.php stores an event inquiry. */

require_once __DIR__ . "/helpers.php";

if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST") {
    fail("Method not allowed.", 405);
}

if (rate_limited("events:" . client_ip(), 8, 3600)) {
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
$category = clean_text($data["category"] ?? "", 60);
$attendees = clean_text($data["attendees"] ?? "", 30);
$eventDate = clean_text($data["event_date"] ?? "", 10);
$body = clean_text($data["msg"] ?? "", 2000);

if ($name === "" || $email === "") {
    fail("Please add your name and email.");
}
if (!valid_email($email)) {
    fail("That email address does not look right.");
}
if ($eventDate !== "" && !valid_date($eventDate)) {
    fail("That date does not look right.");
}

$stmt = db()->prepare("INSERT INTO event_inquiries (name, email, category, attendees, event_date, body) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->execute([$name, $email, $category, $attendees, $eventDate, $body]);

respond(["ok" => true]);
