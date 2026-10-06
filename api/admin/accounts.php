<?php
/* Sai Inn admin accounts: view registered guests. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "list") {
    require_admin();
    $rows = db()->query(
        "SELECT u.id, u.name, u.email, u.phone, u.created_at,
                (SELECT COUNT(*) FROM bookings b
                  WHERE b.email = u.email OR (b.phone <> '' AND b.phone = u.phone)) AS bookings
         FROM users u ORDER BY u.id DESC"
    )->fetchAll();
    respond(["ok" => true, "users" => $rows]);
}

if ($action === "delete") {
    require_admin_write();
    $data = body_fields();
    db()->prepare("DELETE FROM users WHERE id = ?")->execute([(int) ($data["id"] ?? 0)]);
    respond(["ok" => true]);
}

fail("Unknown action.", 404);
