<?php
/* Sai Inn admin menu CRUD: description + photo gallery per dish + ordering. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT * FROM menu_items ORDER BY sort, id")->fetchAll();
    foreach ($rows as &$r) {
        $r["price"] = $r["price"] === null ? null : (float) $r["price"];
        $imgs = json_decode($r["images"] ?? "[]", true);
        $r["images"] = is_array($imgs) ? $imgs : [];
    }
    respond(["ok" => true, "items" => $rows]);
}

if ($action === "save") {
    require_admin_write();
    $d = body_fields();
    $id = (int) ($d["id"] ?? 0);
    $category = clean_text($d["category"] ?? "", 40);
    $name = clean_text($d["name"] ?? "", 80);
    $priceRaw = $d["price"] ?? "";
    $price = ($priceRaw === "" || $priceRaw === null) ? null : (float) $priceRaw;
    $image = clean_text($d["image"] ?? "", 255);
    $description = clean_text($d["description"] ?? "", 500);
    $imgs = $d["images"] ?? null;
    if (!is_array($imgs)) {
        $imgs = $image ? [$image] : [];
    }
    $imgs = array_values(array_filter(array_map(function ($s) {
        return clean_text($s, 255);
    }, $imgs)));
    if (!$imgs && $image !== "") {
        $imgs = [$image];
    }
    $main = $imgs ? $imgs[0] : "";

    if ($name === "" || $category === "") {
        fail("Category and dish name are required.");
    }
    if ($price !== null && $price < 0) {
        fail("Price cannot be negative.");
    }
    if ($main !== "" && !preg_match('#^(uploads/|assets/)#', $main)) {
        fail("Image path is not valid.");
    }

    $pdo = db();
    if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE menu_items SET category=?, name=?, price=?, image=?, description=?, images=? WHERE id=?");
        $stmt->execute([$category, $name, $price, $main, $description, json_encode($imgs), $id]);
        respond(["ok" => true, "id" => $id]);
    }
    $next = (int) $pdo->query("SELECT COALESCE(MAX(sort), 0) + 1 FROM menu_items")->fetchColumn();
    $stmt = $pdo->prepare("INSERT INTO menu_items (slug, category, name, price, image, description, images, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([slugify($name, "menu_items"), $category, $name, $price, $main, $description, json_encode($imgs), $next]);
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
        $stmt = $pdo->prepare("UPDATE menu_items SET sort = ? WHERE id = ?");
        $stmt->execute([(int) $pos, (int) $id]);
    }
    $pdo->commit();
    respond(["ok" => true]);
}

if ($action === "delete") {
    require_admin_write();
    $id = (int) ((body_fields())["id"] ?? 0);
    if ($id <= 0) {
        fail("Missing item id.");
    }
    db()->prepare("DELETE FROM menu_items WHERE id = ?")->execute([$id]);
    respond(["ok" => true]);
}

fail("Unknown action.", 400);
