<?php
/* admin: download the site content as a snapshot file */
require_once __DIR__ . "/guard.php";
require_admin();

$pdo = db();

function ex_rows(string $table, array $cols, ?array $jsonCols = null): array
{
    $rows = db()->query("SELECT " . implode(", ", $cols) . " FROM " . $table . " ORDER BY sort, id")->fetchAll();
    foreach ($rows as &$r) {
        foreach ($jsonCols ?: [] as $c) {
            $v = json_decode((string) ($r[$c] ?? ""), true);
            $r[$c] = is_array($v) ? $v : [];
        }
    }
    unset($r);
    return $rows;
}

$content = [];
foreach ($pdo->query("SELECT key, value FROM content")->fetchAll() as $row) {
    $content[] = ["key" => $row["key"], "value" => $row["value"]];
}

$snapshot = [
    "content" => $content,
    "rooms" => ex_rows("rooms", ["slug", "name", "price", "image", "gallery", "description", "amenities", "sort"], ["gallery", "amenities"]),
    "menu_items" => ex_rows("menu_items", ["slug", "category", "name", "price", "image", "images", "description", "sort"], ["images"]),
    "gallery_items" => ex_rows("gallery_items", ["src", "category", "caption", "sort"]),
    "events" => ex_rows("events", ["name", "description", "icon", "image", "sort"]),
    "testimonials" => ex_rows("testimonials", ["text", "name", "role", "stars", "avatar", "sort"]),
    "offers" => ex_rows("offers", ["title", "badge", "text", "code", "discount_pct", "active", "sort", "image"]),
    "journal_posts" => ex_rows("journal_posts", ["title", "excerpt", "body", "image", "images", "sort"], ["images"]),
    "announcements" => ex_rows("announcements", ["title", "body", "kind", "images", "active", "pinned", "starts_on", "ends_on", "sort"], ["images"]),
];

$name = "sai-inn-content-" . date("Y-m-d") . ".json";
header("Content-Type: application/json; charset=utf-8");
header("Content-Disposition: attachment; filename=\"" . $name . "\"");
header("Cache-Control: no-store");
echo json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
