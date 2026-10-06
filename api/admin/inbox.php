<?php
/* Sai Inn admin inbox: contact messages + event inquiries, with read state. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "messages") {
    require_admin();
    $rows = db()->query("SELECT * FROM messages ORDER BY id DESC LIMIT 200")->fetchAll();
    respond(["ok" => true, "items" => $rows]);
}

if ($action === "inquiries") {
    require_admin();
    $rows = db()->query("SELECT * FROM event_inquiries ORDER BY id DESC LIMIT 200")->fetchAll();
    respond(["ok" => true, "items" => $rows]);
}

if ($action === "mark") {
    require_admin_write();
    $d = body_fields();
    $id = (int) ($d["id"] ?? 0);
    $table = ($d["table"] ?? "") === "inquiries" ? "event_inquiries" : "messages";
    if ($id <= 0) {
        fail("Missing id.");
    }
    db()->prepare("UPDATE " . $table . " SET read = 1 WHERE id = ?")->execute([$id]);
    respond(["ok" => true]);
}

if ($action === "unread") {
    require_admin();
    $m = (int) db()->query("SELECT COUNT(*) FROM messages WHERE read = 0")->fetchColumn();
    $i = (int) db()->query("SELECT COUNT(*) FROM event_inquiries WHERE read = 0")->fetchColumn();
    respond(["ok" => true, "messages" => $m, "inquiries" => $i]);
}

if ($action === "delete") {
    require_admin_write();
    $d = body_fields();
    $id = (int) ($d["id"] ?? 0);
    $table = $d["table"] === "inquiries" ? "event_inquiries" : "messages";
    if ($id <= 0) {
        fail("Missing id.");
    }
    db()->prepare("DELETE FROM " . $table . " WHERE id = ?")->execute([$id]);
    respond(["ok" => true]);
}

fail("Unknown action.", 400);
