<?php
/* admin: restore the default content */

require_once __DIR__ . "/guard.php";
require_admin_write();

$seedFile = __DIR__ . "/seed-data.json";
if (!is_file($seedFile)) {
    fail("Seed file missing.");
}
$seed = json_decode(file_get_contents($seedFile), true);
if (!is_array($seed)) {
    fail("Seed file is broken.");
}

$pdo = db();
$pdo->exec("DELETE FROM rooms");
$pdo->exec("DELETE FROM menu_items");
$pdo->exec("DELETE FROM gallery_items");
$pdo->exec("DELETE FROM events");
$pdo->exec("DELETE FROM testimonials");
$pdo->exec("DELETE FROM offers");
$pdo->exec("DELETE FROM journal_posts");

foreach (($seed["rooms"] ?? []) as $i => $r) {
    $stmt = $pdo->prepare("INSERT INTO rooms (slug, name, price, description, amenities, image, gallery, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        slugify($r["name"], "rooms"), $r["name"], (int) $r["price"], $r["desc"] ?? "", json_encode($r["amenities"] ?? []),
        $r["img"] ?? "", json_encode($r["gallery"] ?? []), $i
    ]);
}
foreach (($seed["menu"] ?? []) as $i => $m) {
    $stmt = $pdo->prepare("INSERT INTO menu_items (slug, category, name, price, image, description, images, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([slugify($m["name"], "menu_items"), $m["cat"], $m["name"], $m["price"], $m["img"] ?? "", $m["desc"] ?? "", json_encode($m["img"] ? [$m["img"]] : []), $i]);
}
foreach (($seed["gallery"] ?? []) as $i => $g) {
    $stmt = $pdo->prepare("INSERT INTO gallery_items (src, category, caption, sort) VALUES (?, ?, '', ?)");
    $stmt->execute([$g["src"], $g["cat"] ?? "", $i]);
}
foreach (($seed["events"] ?? []) as $i => $e) {
    $stmt = $pdo->prepare("INSERT INTO events (name, description, icon, image, sort) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$e["name"], $e["desc"], $e["icon"], $e["img"] ?? "", $i]);
}
foreach (($seed["testimonials"] ?? []) as $i => $t) {
    $stmt = $pdo->prepare("INSERT INTO testimonials (text, name, role, stars, avatar, sort) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$t["text"], $t["name"], $t["role"], (int) $t["stars"], $t["img"] ?? "", $i]);
}
foreach (($seed["offers"] ?? []) as $i => $o) {
    $stmt = $pdo->prepare("INSERT INTO offers (title, badge, text, code, discount_pct, active, sort) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $o["title"], $o["badge"] ?? "", $o["text"] ?? "",
        strtoupper($o["code"] ?? ""), (int) ($o["discount_pct"] ?? 0),
        (int) ($o["active"] ?? 1), $i
    ]);
}
foreach (($seed["journal"] ?? []) as $i => $p) {
    $img = $p["image"] ?? "";
    $imgs = $img ? [$img] : [];
    $stmt = $pdo->prepare("INSERT INTO journal_posts (title, excerpt, body, image, images, sort) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$p["title"], $p["excerpt"] ?? "", $p["body"] ?? "", $img, json_encode($imgs), $i]);
}

respond(["ok" => true, "note" => "Default content restored."]);
