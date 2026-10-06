<?php
/* Sai Inn one-time admin setup.
   Only runs when data/.setup_allowed exists (created deliberately by the
   person deploying the site). After creating the first admin, the marker is
   removed, so this endpoint can never be used again. */

require_once __DIR__ . "/helpers.php";

$marker = DB_DIR . "/.setup_allowed";

if (($_SERVER["REQUEST_METHOD"] ?? "") !== "POST" || !is_file($marker)) {
    fail("Setup is not available.", 404);
}

$data = body_fields();
$username = clean_text($data["username"] ?? "", 60);
$password = (string) ($data["password"] ?? "");

if (!preg_match('/^[a-zA-Z0-9_.-]{3,40}$/', $username)) {
    fail("Username: 3 to 40 letters, numbers, dots, dashes or underscores.");
}
if (strlen($password) < 10) {
    fail("Password must be at least 10 characters.");
}

$existing = db()->query("SELECT COUNT(*) AS c FROM admins")->fetch();
if ((int) $existing["c"] > 0) {
    fail("An admin already exists.");
}

$stmt = db()->prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)");
$stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
@unlink($marker);

respond(["ok" => true]);
