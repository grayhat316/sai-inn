<?php
/* Sai Inn admin rooms CRUD.
   GET  ?action=list
   POST {action:save, id?, name, price, description, amenities[], image, gallery[], sort} */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT * FROM rooms ORDER BY sort, id")->fetchAll();
    foreach ($rows as &$r) {
        $r["price"] = (int) $r["price"];
        $r["amenities"] = json_decode($r["amenities"], true) ?: [];
        $r["gallery"] = json_decode($r["gallery"], true) ?: [];
    }
    respond(["ok" => true, "rooms" => $rows]);
}

if ($action === "save") {
    require_admin_write();
    $d = body_fields();
    $id = (int) ($d["id"] ?? 0);
    $name = clean_text($d["name"] ?? "", 80);
    $price = (int) ($d["price"] ?? 0);
    $description = clean_text($d["description"] ?? "", 800);
    $amenities = array_values(array_filter(array_map(function ($a) {
        return clean_text($a, 60);
    }, is_array($d["amenities"] ?? null) ? $d["amenities"] : [])));
    $image = clean_text($d["image"] ?? "", 255);
    $gallery = array_values(array_filter(array_map(function ($g) {
        return clean_text($g, 255);
    }, is_array($d["gallery"] ?? null) ? $d["gallery"] : [])));
    $sort = (int) ($d["sort"] ?? 0);

    if ($name === "" || $price <= 0) {
        fail("Name and a positive price are required.");
    }
    if ($image !== "" && !preg_match('#^(uploads/|assets/)#', $image)) {
        fail("Image path is not valid.");
    }

    $pdo = db();
    if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE rooms SET name=?, price=?, description=?, amenities=?, image=?, gallery=? WHERE id=?");
        $stmt->execute([$name, $price, $description, json_encode($amenities), $image, json_encode($gallery), $id]);
        respond(["ok" => true, "id" => $id]);
    }
    $next = (int) $pdo->query("SELECT COALESCE(MAX(sort), 0) + 1 FROM rooms")->fetchColumn();
    $stmt = $pdo->prepare("INSERT INTO rooms (slug, name, price, description, amenities, image, gallery, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([slugify($name, "rooms"), $name, $price, $description, json_encode($amenities), $image, json_encode($gallery), $next]);
    respond(["ok" => true, "id" => (int) $pdo->lastInsertId()]);
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
        $stmt = $pdo->prepare("UPDATE rooms SET sort = ? WHERE id = ?");
        $stmt->execute([(int) $pos, (int) $id]);
    }
    $pdo->commit();
    respond(["ok" => true]);
}

if ($action === "delete") {
    require_admin_write();
    $d = body_fields();
    $id = (int) ($d["id"] ?? 0);
    if ($id <= 0) {
        fail("Missing room id.");
    }
    db()->prepare("DELETE FROM rooms WHERE id = ?")->execute([$id]);
    respond(["ok" => true]);
}

fail("Unknown action.", 400);
