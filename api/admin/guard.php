<?php
/* Sai Inn admin session guard: auth + CSRF checks for every admin endpoint. */

require_once __DIR__ . "/../helpers.php";

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        "lifetime" => 0,
        "path" => "/",
        "httponly" => true,
        "samesite" => "Lax",
        "secure" => (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off"),
    ]);
    session_start();
}

function admin_id(): int
{
    return (int) ($_SESSION["admin_id"] ?? 0);
}

/* how many administrators exist: 0 means the install was never claimed */
function admin_count(): int
{
    return (int) db()->query("SELECT COUNT(*) FROM admins")->fetchColumn();
}

function require_admin(): void
{
    if (admin_id() <= 0) {
        fail("Not logged in.", 401);
    }
}

function csrf_token(): string
{
    if (empty($_SESSION["csrf"])) {
        $_SESSION["csrf"] = bin2hex(random_bytes(24));
    }
    return $_SESSION["csrf"];
}

function require_csrf(): void
{
    $sent = $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "";
    if ($sent === "" || !hash_equals($_SESSION["csrf"] ?? "", $sent)) {
        fail("Session expired. Refresh and try again.", 403);
    }
}

/* all admin writes go through this */
function require_admin_write(): void
{
    require_admin();
    require_csrf();
}
