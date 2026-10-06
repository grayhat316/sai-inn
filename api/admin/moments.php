<?php
/* Sai Inn admin moments: review guest photos. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT * FROM moments ORDER BY (status = 'pending') DESC, sort, id DESC")->fetchAll();
    respond(["ok" => true, "moments" => $rows]);
}

if ($action === "approve") {
    require_admin_write();
    $data = body_fields();
    $id = (int) ($data["id"] ?? 0);
    $stmt = db()->prepare("UPDATE moments SET status = 'approved' WHERE id = ?");
    $stmt->execute([$id]);
    respond(["ok" => true]);
}

if ($action === "delete") {
    require_admin_write();
    $data = body_fields();
    $id = (int) ($data["id"] ?? 0);
    $stmt = db()->prepare("SELECT image, images FROM moments WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row) {
        $files = json_decode($row["images"], true);
        if (!is_array($files) || !$files) {
            $files = $row["image"] ? [$row["image"]] : [];
        }
        foreach ($files as $f) {
            $path = dirname(__DIR__, 2) . "/" . $f;
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
    db()->prepare("DELETE FROM moments WHERE id = ?")->execute([$id]);
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
        $stmt = $pdo->prepare("UPDATE moments SET sort = ? WHERE id = ?");
        $stmt->execute([(int) $pos, (int) $id]);
    }
    $pdo->commit();
    respond(["ok" => true]);
}

fail("Unknown action.", 404);
