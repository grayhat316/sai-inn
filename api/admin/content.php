<?php
/* Sai Inn admin content (site text) + settings. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

$ALLOWED_KEYS = [
    "hero_eyebrow", "hero_title_1", "hero_title_2", "hero_sub",
    "welcome_title", "welcome_1", "welcome_2", "welcome_3",
    "mission", "vision",
    "phone", "phone_short", "email", "address", "hours",
    "restaurant_hours", "tagline"
];

if ($action === "list") {
    require_admin();
    $rows = db()->query("SELECT key, value FROM content")->fetchAll();
    $map = [];
    foreach ($rows as $r) {
        $map[$r["key"]] = $r["value"];
    }
    respond(["ok" => true, "content" => $map]);
}

if ($action === "save") {
    require_admin_write();
    $d = body_fields();
    $values = is_array($d["values"] ?? null) ? $d["values"] : [];
    $pdo = db();
    $stmt = $pdo->prepare("INSERT INTO content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    $saved = 0;
    foreach ($values as $k => $v) {
        if (!in_array($k, $ALLOWED_KEYS, true)) {
            continue;
        }
        $stmt->execute([$k, clean_text($v, 2000)]);
        $saved++;
    }
    respond(["ok" => true, "saved" => $saved]);
}

fail("Unknown action.", 400);
