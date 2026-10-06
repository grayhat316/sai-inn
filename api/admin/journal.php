<?php
/* Sai Inn admin journal: notes and stories shown on the journal page. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT * FROM journal_posts ORDER BY sort, id DESC")->fetchAll();
    foreach ($rows as &$r) {
        $imgs = json_decode((string) ($r["images"] ?? ""), true);
        if (!is_array($imgs)) {
            $imgs = $r["image"] !== "" ? [$r["image"]] : [];
        }
        $r["images"] = array_values(array_filter($imgs, function ($s) {
            return is_string($s) && $s !== "";
        }));
    }
    unset($r);
    respond(["ok" => true, "posts" => $rows]);
}

if ($action === "save") {
    require_admin_write();
    $data = body_fields();
    $id = (int) ($data["id"] ?? 0);
    $title = clean_text($data["title"] ?? "", 140);
    $excerpt = clean_text($data["excerpt"] ?? "", 300);
    $body = clean_text($data["body"] ?? "", 6000);
    $image = clean_text($data["image"] ?? "", 300);
    $sort = (int) ($data["sort"] ?? 0);
    $imgs = $data["images"] ?? null;
    if (!is_array($imgs)) {
        $imgs = $image ? [$image] : [];
    }
    $imgs = array_values(array_filter(array_map(function ($s) {
        return clean_text($s, 300);
    }, $imgs)));
    if (!$imgs && $image !== "") {
        $imgs = [$image];
    }
    $main = $imgs ? $imgs[0] : "";
    if ($title === "") {
        fail("Give the post a title.");
    }
    if ($id > 0) {
        $stmt = db()->prepare("UPDATE journal_posts SET title = ?, excerpt = ?, body = ?, image = ?, images = ?, sort = ? WHERE id = ?");
        $stmt->execute([$title, $excerpt, $body, $main, json_encode($imgs), $sort, $id]);
        respond(["ok" => true, "id" => $id]);
    }
    $stmt = db()->prepare("INSERT INTO journal_posts (title, excerpt, body, image, images, sort) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$title, $excerpt, $body, $main, json_encode($imgs), $sort]);
    respond(["ok" => true, "id" => (int) db()->lastInsertId()]);
}

if ($action === "delete") {
    require_admin_write();
    $data = body_fields();
    db()->prepare("DELETE FROM journal_posts WHERE id = ?")->execute([(int) ($data["id"] ?? 0)]);
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
        $stmt = $pdo->prepare("UPDATE journal_posts SET sort = ? WHERE id = ?");
        $stmt->execute([(int) $pos, (int) $id]);
    }
    $pdo->commit();
    respond(["ok" => true]);
}

fail("Unknown action.", 404);
