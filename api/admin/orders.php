<?php
/* Sai Inn admin food orders: list, status, delete. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT * FROM food_orders ORDER BY (status = 'new') DESC, id DESC LIMIT 300")->fetchAll();
    foreach ($rows as &$r) {
        $r["items"] = json_decode($r["items"], true) ?: [];
        $r["total"] = (int) $r["total"];
    }
    respond(["ok" => true, "orders" => $rows]);
}

if ($action === "status") {
    require_admin_write();
    $d = body_fields();
    $id = (int) ($d["id"] ?? 0);
    $status = $d["status"] ?? "";
    if (!in_array($status, ["new", "confirmed", "completed", "cancelled"], true)) {
        fail("Unknown status.");
    }
    db()->prepare("UPDATE food_orders SET status = ? WHERE id = ?")->execute([$status, $id]);
    respond(["ok" => true]);
}

if ($action === "delete") {
    require_admin_write();
    $id = (int) ((body_fields())["id"] ?? 0);
    if ($id <= 0) {
        fail("Missing order id.");
    }
    db()->prepare("DELETE FROM food_orders WHERE id = ?")->execute([$id]);
    respond(["ok" => true]);
}

fail("Unknown action.", 400);
