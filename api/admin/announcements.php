<?php
/* Sai Inn admin announcements: notices and news shown on the site.
   An announcement can be pinned (shows as the strip under the header),
   scheduled with dates, and carries any number of photos. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

function ann_row(array $r): array
{
    $imgs = json_decode((string) ($r["images"] ?? ""), true);
    if (!is_array($imgs)) {
        $imgs = [];
    }
    $r["images"] = array_values(array_filter($imgs, function ($s) {
        return is_string($s) && $s !== "";
    }));
    return $r;
}

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT * FROM announcements ORDER BY sort, id DESC")->fetchAll();
    respond(["ok" => true, "announcements" => array_map("ann_row", $rows)]);
}

if ($action === "save") {
    require_admin_write();
    $data = body_fields();
    $id = (int) ($data["id"] ?? 0);
    $title = clean_text($data["title"] ?? "", 140);
    $body = clean_text($data["body"] ?? "", 6000);
    $kind = clean_text($data["kind"] ?? "Notice", 30);
    $active = (int) ($data["active"] ?? 1);
    $pinned = (int) ($data["pinned"] ?? 0);
    $starts = clean_text($data["starts_on"] ?? "", 20);
    $ends = clean_text($data["ends_on"] ?? "", 20);
    $sort = (int) ($data["sort"] ?? 0);

    $allowed = ["Notice", "Guest perk", "News"];
    if (!in_array($kind, $allowed, true)) {
        $kind = "Notice";
    }

    $imgs = $data["images"] ?? null;
    if (!is_array($imgs)) {
        $imgs = [];
    }
    $imgs = array_values(array_filter(array_map(function ($s) {
        return clean_text($s, 300);
    }, $imgs), function ($s) {
        return $s !== "";
    }));

    foreach ([$starts, $ends] as $d) {
        if ($d !== "" && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
            fail("Dates must look like 2026-10-20.");
        }
    }
    if ($starts !== "" && $ends !== "" && $ends < $starts) {
        fail("The end date is before the start date.");
    }
    if ($title === "") {
        fail("Give the announcement a title.");
    }
    if ($body === "") {
        fail("Write the message guests should read.");
    }

    $images = json_encode($imgs);

    if ($id > 0) {
        $stmt = db()->prepare("UPDATE announcements SET title = ?, body = ?, kind = ?, images = ?, active = ?, pinned = ?, starts_on = ?, ends_on = ?, sort = ? WHERE id = ?");
        $stmt->execute([$title, $body, $kind, $images, $active, $pinned, $starts, $ends, $sort, $id]);
        respond(["ok" => true, "id" => $id]);
    }
    $stmt = db()->prepare("INSERT INTO announcements (title, body, kind, images, active, pinned, starts_on, ends_on, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$title, $body, $kind, $images, $active, $pinned, $starts, $ends, $sort]);
    respond(["ok" => true, "id" => (int) db()->lastInsertId()]);
}

if ($action === "toggle") {
    require_admin_write();
    $data = body_fields();
    $id = (int) ($data["id"] ?? 0);
    $field = ($data["field"] ?? "active") === "pinned" ? "pinned" : "active";
    $stmt = db()->prepare("UPDATE announcements SET " . $field . " = 1 - " . $field . " WHERE id = ?");
    $stmt->execute([$id]);
    respond(["ok" => true]);
}

if ($action === "delete") {
    require_admin_write();
    $data = body_fields();
    db()->prepare("DELETE FROM announcements WHERE id = ?")->execute([(int) ($data["id"] ?? 0)]);
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
        $stmt = $pdo->prepare("UPDATE announcements SET sort = ? WHERE id = ?");
        $stmt->execute([(int) $pos, (int) $id]);
    }
    $pdo->commit();
    respond(["ok" => true]);
}

fail("Unknown action.", 404);
