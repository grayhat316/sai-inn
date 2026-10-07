<?php
/* where am I: what this copy is, where it runs, and what content it holds.
   Safe to leave public: no secrets, no absolute paths. */
require_once __DIR__ . "/db.php";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

$root = dirname(__DIR__);
$build = [];
$buildFile = $root . "/build.json";
if (is_file($buildFile)) {
    $decoded = json_decode((string) file_get_contents($buildFile), true);
    if (is_array($decoded)) {
        $build = $decoded;
    }
}

/* which host is this? */
$env = "Your own machine";
$disk = "permanent";
if (getenv("RENDER")) {
    $env = "Render (free plan, sleeps when idle)";
    $disk = "temporary: a redeploy starts from the repo snapshot";
} elseif (is_file("/.dockerenv")) {
    $env = "Docker container";
    $disk = "depends on the host";
} elseif (getenv("HTTP_X_FORWARDED_HOST") || (getenv("HTTP_X_FORWARDED_FOR") && !getenv("RENDER"))) {
    $env = "shared hosting or tunnel";
}

/* is this the laptop copy reached through a tunnel? */
$host = $_SERVER["HTTP_HOST"] ?? "unknown";
$forwarded = $_SERVER["HTTP_X_FORWARDED_HOST"] ?? "";
if (str_contains($host, "trycloudflare.com") || str_contains($forwarded, "trycloudflare.com")) {
    $env = "Your own machine, reached through a Cloudflare tunnel";
    $disk = "permanent for as long as your laptop is on";
} elseif (!empty($_SERVER["HTTP_CF_RAY"]) && str_contains($host, "trycloudflare.com")) {
    $env = "Your own machine, reached through a Cloudflare tunnel";
    $disk = "permanent for as long as your laptop is on";
}

$counts = [];
foreach (["rooms", "menu_items", "gallery_items", "events", "testimonials", "offers", "journal_posts", "announcements"] as $table) {
    $counts[$table] = (int) db()->query("SELECT COUNT(*) FROM " . $table)->fetchColumn();
}
$guest = [];
foreach (["bookings", "food_orders", "messages", "moments"] as $table) {
    try {
        $guest[$table] = (int) db()->query("SELECT COUNT(*) FROM " . $table)->fetchColumn();
    } catch (Throwable $e) {
        $guest[$table] = null;
    }
}

$dataDir = dirname(DB_FILE);
$size = is_file(DB_FILE) ? (int) filesize(DB_FILE) : 0;
$firstRow = db()->query("SELECT MIN(created_at) FROM announcements")->fetchColumn();

echo json_encode([
    "ok" => true,
    "site" => "Sai Inn Hotel website",
    "build" => [
        "stamp" => $build["build"] ?? "unknown",
        "commit" => $build["commit"] ?? "unknown",
        "pushed" => $build["pushed"] ?? "",
        "change" => $build["change"] ?? "",
    ],
    "runs_on" => $env,
    "disk" => $disk,
    "url_you_used" => $host,
    "server" => [
        "software" => $_SERVER["SERVER_SOFTWARE"] ?? "unknown",
        "php" => PHP_VERSION,
        "https" => (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "yes" : "no",
    ],
    "content" => $counts,
    "guest_records" => $guest,
    "database" => [
        "size" => $size,
        "created" => is_file(DB_FILE) ? date("c", (int) filemtime(DB_FILE)) : "not created yet",
        "installed_seed" => is_file($dataDir . "/.seeded") ? "yes" : "no",
        "oldest_announcement" => $firstRow ?: "",
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
