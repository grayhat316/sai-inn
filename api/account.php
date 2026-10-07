<?php
/* guest accounts: register, sign in, sign out, my account */

require_once __DIR__ . "/helpers.php";
sess_start();

$action = $_GET["action"] ?? "";
if ($action === "" && $_SERVER["REQUEST_METHOD"] === "POST") {
    $post = $_POST;
    $action = is_array($post) ? (string) ($post["action"] ?? "") : "";
}

function loyalty_tier(int $stays): array
{
    if ($stays >= 5) {
        return ["name" => "Gold", "discount_pct" => 10];
    }
    if ($stays >= 3) {
        return ["name" => "Silver", "discount_pct" => 5];
    }
    return ["name" => "Guest", "discount_pct" => 0];
}

if ($action === "register") {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        fail("Method not allowed.", 405);
    }
    if (rate_limited("reg:" . client_ip(), 10, 3600)) {
        fail("Too many attempts. Please try again later.", 429);
    }
    if (!referer_ok()) {
        fail("Request rejected.");
    }
    $data = body_fields();
    if (!honeypot_ok($data)) {
        respond(["ok" => true, "note" => "received"]);
    }
    $name = clean_text($data["name"] ?? "", 80);
    $email = strtolower(clean_text($data["email"] ?? "", 120));
    $phone = clean_text($data["phone"] ?? "", 20);
    $pass = (string) ($data["password"] ?? "");
    $resetQ = clean_text($data["reset_q"] ?? "", 60);
    $resetA = (string) ($data["reset_a"] ?? "");
    if ($name === "") {
        fail("Please give us your name.");
    }
    if ($email === "" || !valid_email($email)) {
        fail("That email address does not look right.");
    }
    if (strlen($pass) < 8) {
        fail("Your password needs at least 8 characters.");
    }
    if ($resetQ === "" || $resetA === "") {
        fail("Pick a security question and answer it. You will need it to reset your password.");
    }
    $stmt = db()->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        fail("An account with that email already exists. Try signing in.");
    }
    $stmt = db()->prepare("INSERT INTO users (name, email, phone, password_hash, reset_q, reset_a) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, $email, $phone, password_hash($pass, PASSWORD_DEFAULT), $resetQ, password_hash(strtolower(trim($resetA)), PASSWORD_DEFAULT)]);
    session_regenerate_id(true);
    $_SESSION["user_id"] = (int) db()->lastInsertId();
    $_SESSION["user_name"] = $name;
    respond(["ok" => true, "name" => $name]);
}

if ($action === "login") {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        fail("Method not allowed.", 405);
    }
    $data = body_fields();
    $email = strtolower(clean_text($data["email"] ?? "", 120));
    $pass = (string) ($data["password"] ?? "");
    if (rate_limited("login:" . client_ip() . ":" . $email, 6, 900)) {
        fail("Too many sign-in attempts. Please wait a few minutes.", 429);
    }
    if (!referer_ok()) {
        fail("Request rejected.");
    }
    $stmt = db()->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u || !password_verify($pass, $u["password_hash"])) {
        fail("Email or password is not right.", 401);
    }
    session_regenerate_id(true);
    $_SESSION["user_id"] = (int) $u["id"];
    $_SESSION["user_name"] = $u["name"];
    respond(["ok" => true, "name" => $u["name"]]);
}

if ($action === "logout") {
    unset($_SESSION["user_id"], $_SESSION["user_name"]);
    respond(["ok" => true]);
}

if ($action === "forgot") {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        fail("Method not allowed.", 405);
    }
    $data = body_fields();
    $email = strtolower(clean_text($data["email"] ?? "", 120));
    if (rate_limited("forgot:" . client_ip() . ":" . $email, 8, 900)) {
        fail("Too many attempts. Please try again in a few minutes.", 429);
    }
    if (!referer_ok()) {
        fail("Request rejected.");
    }
    $stmt = db()->prepare("SELECT reset_q FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u || $u["reset_q"] === "") {
        respond(["ok" => true, "question" => ""]); // same reply either way; no account discovery
    }
    respond(["ok" => true, "question" => $u["reset_q"]]);
}

if ($action === "reset") {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        fail("Method not allowed.", 405);
    }
    $data = body_fields();
    $email = strtolower(clean_text($data["email"] ?? "", 120));
    $answer = (string) ($data["answer"] ?? "");
    $next = (string) ($data["password"] ?? "");
    if (rate_limited("reset:" . client_ip() . ":" . $email, 6, 900)) {
        fail("Too many attempts. Please try again in a few minutes.", 429);
    }
    if (!referer_ok()) {
        fail("Request rejected.");
    }
    if (strlen($next) < 8) {
        fail("Your new password needs at least 8 characters.");
    }
    $stmt = db()->prepare("SELECT id, reset_a FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u || $u["reset_a"] === "" || !password_verify(strtolower(trim($answer)), $u["reset_a"])) {
        fail("That does not match. Check your answer, or call 0726 071 111 and reception will help.", 401);
    }
    $stmt = db()->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $stmt->execute([password_hash($next, PASSWORD_DEFAULT), $u["id"]]);
    respond(["ok" => true, "note" => "Password updated. Sign in with your new password."]);
}

if ($action === "me") {
    $uid = guest_id();
    if (!$uid) {
        respond(["ok" => true, "authed" => false]);
    }
    $stmt = db()->prepare("SELECT id, name, email, phone, created_at FROM users WHERE id = ?");
    $stmt->execute([$uid]);
    $u = $stmt->fetch();
    if (!$u) {
        unset($_SESSION["user_id"], $_SESSION["user_name"]);
        respond(["ok" => true, "authed" => false]);
    }
    $stmt = db()->prepare(
        "SELECT ref, checkin, checkout, nights, guests, room_type, status, discount, offer_code, created_at
         FROM bookings
         WHERE email = ? OR (phone <> '' AND phone = ?)
         ORDER BY id DESC LIMIT 50"
    );
    $stmt->execute([$u["email"], $u["phone"]]);
    $bookings = $stmt->fetchAll();
    $stays = 0;
    foreach ($bookings as $b) {
        if (in_array($b["status"], ["confirmed", "completed"], true)) {
            $stays++;
        }
    }
    respond([
        "ok" => true,
        "authed" => true,
        "user" => $u,
        "bookings" => $bookings,
        "stays" => $stays,
        "tier" => loyalty_tier($stays),
    ]);
}

fail("Unknown action.", 404);
