<?php
/* Sai Inn admin events CRUD. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");
$ICONS = ["ring", "cake", "people", "cloche", "gift", "briefcase"];

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT * FROM events ORDER BY sort, id")->fetchAll();
    respond(["ok" => true, "items" => $rows]);
}

if ($action === "save") {
    require_admin_write();
    $d = body_fields();
    $id = (int) ($d["id"] ?? 0);
    $name = clean_text($d["name"] ?? "", 60);
    $description = clean_text($d["description"] ?? "", 400);
    $icon = clean_text($d["icon"] ?? "people", 20);
    $image = clean_text($d["image"] ?? "", 255);
    $sort = (int) ($d["sort"] ?? 0);

    if ($name === "") {
        fail("Event name is required.");
    }
    if (!in_array($icon, $ICONS, true)) {
        $icon = "people";
    }
    if ($image !== "" && !preg_match('#^(uploads/|assets/)#', $image)) {
        fail("Image path is not valid.");
    }

    $pdo = db();
    if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE events SET name=?, description=?, icon=?, image=?, sort=? WHERE id=?");
        $stmt->execute([$name, $description, $icon, $image, $sort, $id]);
        respond(["ok" => true, "id" => $id]);
    }
    $stmt = $pdo->prepare("INSERT INTO events (name, description, icon, image, sort) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$name, $description, $icon, $image, $sort]);
    respond(["ok" => true, "id" => (int) $pdo->lastInsertId()]);
}

if ($action === "delete") {
    require_admin_write();
    $id = (int) ((body_fields())["id"] ?? 0);
    if ($id <= 0) {
        fail("Missing item id.");
    }
    db()->prepare("DELETE FROM events WHERE id = ?")->execute([$id]);
    respond(["ok" => true]);
}

if ($action === "order") {
    require_admin_write();
    $d = body_fields();
    $ids = $d["ids"] ?? null;
    if (!is_array($ids) || !$ids) {
        fail("Missing order.");
    }
    $pdo = db();
    $pdo->beginTransaction();
    foreach ($ids as $pos => $id) {
        $stmt = $pdo->prepare("UPDATE events SET sort = ? WHERE id = ?");
        $stmt->execute([(int) $pos, (int) $id]);
    }
    $pdo->commit();
    respond(["ok" => true]);
}

fail("Unknown action.", 400);
