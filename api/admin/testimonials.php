<?php
/* Sai Inn admin testimonials CRUD. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT * FROM testimonials ORDER BY sort, id")->fetchAll();
    foreach ($rows as &$r) {
        $r["stars"] = (int) $r["stars"];
    }
    respond(["ok" => true, "items" => $rows]);
}

if ($action === "save") {
    require_admin_write();
    $d = body_fields();
    $id = (int) ($d["id"] ?? 0);
    $text = clean_text($d["text"] ?? "", 600);
    $name = clean_text($d["name"] ?? "", 60);
    $role = clean_text($d["role"] ?? "", 40);
    $stars = max(1, min(5, (int) ($d["stars"] ?? 5)));
    $avatar = clean_text($d["avatar"] ?? "", 255);
    $sort = (int) ($d["sort"] ?? 0);

    if ($text === "" || $name === "") {
        fail("Quote and name are required.");
    }
    if ($avatar !== "" && !preg_match('#^(uploads/|assets/)#', $avatar)) {
        fail("Avatar path is not valid.");
    }

    $pdo = db();
    if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE testimonials SET text=?, name=?, role=?, stars=?, avatar=?, sort=? WHERE id=?");
        $stmt->execute([$text, $name, $role, $stars, $avatar, $sort, $id]);
        respond(["ok" => true, "id" => $id]);
    }
    $stmt = $pdo->prepare("INSERT INTO testimonials (text, name, role, stars, avatar, sort) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$text, $name, $role, $stars, $avatar, $sort]);
    respond(["ok" => true, "id" => (int) $pdo->lastInsertId()]);
}

if ($action === "delete") {
    require_admin_write();
    $id = (int) ((body_fields())["id"] ?? 0);
    if ($id <= 0) {
        fail("Missing item id.");
    }
    db()->prepare("DELETE FROM testimonials WHERE id = ?")->execute([$id]);
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
        $stmt = $pdo->prepare("UPDATE testimonials SET sort = ? WHERE id = ?");
        $stmt->execute([(int) $pos, (int) $id]);
    }
    $pdo->commit();
    respond(["ok" => true]);
}

fail("Unknown action.", 400);
