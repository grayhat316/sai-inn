<?php
/* Sai Inn admin offers: promotions shown on the home page. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT * FROM offers ORDER BY sort, id")->fetchAll();
    respond(["ok" => true, "offers" => $rows]);
}

if ($action === "save") {
    require_admin_write();
    $data = body_fields();
    $id = (int) ($data["id"] ?? 0);
    $title = clean_text($data["title"] ?? "", 100);
    $badge = clean_text($data["badge"] ?? "", 40);
    $text = clean_text($data["text"] ?? "", 400);
    $code = strtoupper(clean_text($data["code"] ?? "", 20));
    $image = clean_text($data["image"] ?? "", 300);
    $pct = (int) ($data["discount_pct"] ?? 0);
    $active = (int) ($data["active"] ?? 1);
    $sort = (int) ($data["sort"] ?? 0);
    if ($title === "") {
        fail("Give the offer a title.");
    }
    if ($pct < 0 || $pct > 100) {
        fail("Discount must be between 0 and 100.");
    }
    if ($id > 0) {
        $stmt = db()->prepare("UPDATE offers SET title = ?, badge = ?, text = ?, code = ?, discount_pct = ?, active = ?, sort = ?, image = ? WHERE id = ?");
        $stmt->execute([$title, $badge, $text, $code, $pct, $active, $sort, $image, $id]);
        respond(["ok" => true, "id" => $id]);
    }
    $stmt = db()->prepare("INSERT INTO offers (title, badge, text, code, discount_pct, active, sort, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$title, $badge, $text, $code, $pct, $active, $sort, $image]);
    respond(["ok" => true, "id" => (int) db()->lastInsertId()]);
}

if ($action === "toggle") {
    require_admin_write();
    $data = body_fields();
    $id = (int) ($data["id"] ?? 0);
    $stmt = db()->prepare("UPDATE offers SET active = 1 - active WHERE id = ?");
    $stmt->execute([$id]);
    respond(["ok" => true]);
}

if ($action === "delete") {
    require_admin_write();
    $data = body_fields();
    db()->prepare("DELETE FROM offers WHERE id = ?")->execute([(int) ($data["id"] ?? 0)]);
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
        $stmt = $pdo->prepare("UPDATE offers SET sort = ? WHERE id = ?");
        $stmt->execute([(int) $pos, (int) $id]);
    }
    $pdo->commit();
    respond(["ok" => true]);
}

fail("Unknown action.", 404);
