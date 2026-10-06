<?php
/* Sai Inn admin auth: login, logout, session check. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "check") {
    if (admin_id() > 0) {
        respond(["ok" => true, "authed" => true]);
    }
    respond(["ok" => true, "authed" => false]);
}

if ($action === "logout") {
    session_destroy();
    respond(["ok" => true]);
}

if ($action === "password") {
    require_admin_write();
    $data = body_fields();
    $current = (string) ($data["current"] ?? "");
    $next = (string) ($data["next"] ?? "");
    if (strlen($next) < 10) {
        fail("New password must be at least 10 characters.");
    }
    $stmt = db()->prepare("SELECT password_hash FROM admins WHERE id = ?");
    $stmt->execute([admin_id()]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($current, $row["password_hash"])) {
        fail("Current password is wrong.", 401);
    }
    db()->prepare("UPDATE admins SET password_hash = ? WHERE id = ?")
        ->execute([password_hash($next, PASSWORD_DEFAULT), admin_id()]);
    respond(["ok" => true]);
}

if ($action === "login") {
    if (($_SERVER["REQUEST_METHOD"] ?? "") !== "POST") {
        fail("Method not allowed.", 405);
    }
    $data = body_fields();
    $username = clean_text($data["username"] ?? "", 60);
    $password = (string) ($data["password"] ?? "");

    if (rate_limited("adminlogin:" . client_ip(), 6, 900)) {
        fail("Too many attempts. Wait 15 minutes.", 429);
    }
    if ($username === "" || $password === "") {
        fail("Enter your username and password.");
    }

    $stmt = db()->prepare("SELECT id, password_hash FROM admins WHERE username = ?");
    $stmt->execute([$username]);
    $admin = $stmt->fetch();

    if (!$admin || !password_verify($password, $admin["password_hash"])) {
        fail("Wrong username or password.", 401);
    }

    session_regenerate_id(true);
    $_SESSION["admin_id"] = (int) $admin["id"];
    $_SESSION["csrf"] = bin2hex(random_bytes(24));

    respond(["ok" => true, "csrf" => csrf_token(), "username" => $username]);
}

fail("Unknown action.", 400);
