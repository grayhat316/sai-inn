<?php
/* Sai Inn admin gallery CRUD. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT * FROM gallery_items ORDER BY sort, id")->fetchAll();
    respond(["ok" => true, "items" => $rows]);
}

if ($action === "save") {
    require_admin_write();
    $d = body_fields();
    $id = (int) ($d["id"] ?? 0);
    $src = clean_text($d["src"] ?? "", 255);
    $category = clean_text($d["category"] ?? "", 40);
    $caption = clean_text($d["caption"] ?? "", 160);
    $sort = (int) ($d["sort"] ?? 0);

    if ($src === "" || !preg_match('#^(uploads/|assets/)#', $src)) {
        fail("Image path is not valid.");
    }

    $pdo = db();
    if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE gallery_items SET src=?, category=?, caption=?, sort=? WHERE id=?");
        $stmt->execute([$src, $category, $caption, $sort, $id]);
        respond(["ok" => true, "id" => $id]);
    }
    $stmt = $pdo->prepare("INSERT INTO gallery_items (src, category, caption, sort) VALUES (?, ?, ?, ?)");
    $stmt->execute([$src, $category, $caption, $sort]);
    respond(["ok" => true, "id" => (int) $pdo->lastInsertId()]);
}

if ($action === "delete") {
    require_admin_write();
    $id = (int) ((body_fields())["id"] ?? 0);
    if ($id <= 0) {
        fail("Missing item id.");
    }
    $stmt = db()->prepare("SELECT src FROM gallery_items WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row && preg_match('#^uploads/#', $row["src"])) {
        $path = dirname(__DIR__, 2) . "/" . $row["src"];
        if (is_file($path)) {
            @unlink($path);
        }
    }
    db()->prepare("DELETE FROM gallery_items WHERE id = ?")->execute([$id]);
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
        $stmt = $pdo->prepare("UPDATE gallery_items SET sort = ? WHERE id = ?");
        $stmt->execute([(int) $pos, (int) $id]);
    }
    $pdo->commit();
    respond(["ok" => true]);
}

fail("Unknown action.", 400);
