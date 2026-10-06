<?php
/* Sai Inn public content feed.
   Returns whatever the admin has saved in the database. The front-end merges
   this over its built-in defaults, and falls back to defaults when empty. */

require_once __DIR__ . "/db.php";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

function public_image($p) {
    if ($p === "") return "";
    return $p; // stored as "uploads/..." or "assets/..." relative to site root
}

$pdo = db();
$out = [];

$rooms = $pdo->query("SELECT * FROM rooms ORDER BY sort, id")->fetchAll();
if ($rooms) {
    $out["rooms"] = array_map(function ($r) {
        return [
            "id" => "room-" . $r["id"],
            "name" => $r["name"],
            "price" => (int) $r["price"],
            "img" => public_image($r["image"]),
            "gallery" => array_values(array_filter(json_decode($r["gallery"], true) ?: [])),
            "desc" => $r["description"],
            "amenities" => json_decode($r["amenities"], true) ?: [],
        ];
    }, $rooms);
}

$menu = $pdo->query("SELECT * FROM menu_items ORDER BY sort, id")->fetchAll();
if ($menu) {
    $out["menu"] = array_map(function ($m) {
        $imgs = json_decode($m["images"] ?? "[]", true);
        if (!is_array($imgs) || !$imgs) {
            $imgs = $m["image"] ? [$m["image"]] : [];
        }
        return [
            "id" => "dish-" . $m["id"],
            "cat" => $m["category"],
            "name" => $m["name"],
            "price" => $m["price"] === null ? null : (float) $m["price"],
            "img" => public_image($m["image"]),
            "images" => array_map("public_image", $imgs),
            "desc" => $m["description"] ?? "",
        ];
    }, $menu);
}

$gallery = $pdo->query("SELECT * FROM gallery_items ORDER BY sort, id")->fetchAll();
if ($gallery) {
    $out["gallery"] = array_map(function ($g) {
        return [
            "src" => public_image($g["src"]),
            "cat" => $g["category"] ?: "Around the Inn",
            "caption" => $g["caption"] ?: "",
        ];
    }, $gallery);
}

$events = $pdo->query("SELECT * FROM events ORDER BY sort, id")->fetchAll();
if ($events) {
    $out["events"] = array_map(function ($e) {
        return [
            "name" => $e["name"],
            "desc" => $e["description"],
            "icon" => $e["icon"],
            "img" => public_image($e["image"]),
        ];
    }, $events);
}

$testimonials = $pdo->query("SELECT * FROM testimonials ORDER BY sort, id")->fetchAll();
if ($testimonials) {
    $out["testimonials"] = array_map(function ($t) {
        return [
            "text" => $t["text"],
            "name" => $t["name"],
            "role" => $t["role"],
            "stars" => (int) $t["stars"],
            "img" => public_image($t["avatar"]),
        ];
    }, $testimonials);
}

$contentRows = $pdo->query("SELECT key, value FROM content")->fetchAll();
if ($contentRows) {
    $content = [];
    foreach ($contentRows as $r) {
        $content[$r["key"]] = $r["value"];
    }
    $out["content"] = $content;
}

$offers = $pdo->query("SELECT * FROM offers WHERE active = 1 ORDER BY sort, id")->fetchAll();
if ($offers) {
    $out["offers"] = array_map(function ($o) {
        return [
            "id" => (int) $o["id"],
            "title" => $o["title"],
            "badge" => $o["badge"],
            "text" => $o["text"],
            "code" => $o["code"],
            "discount_pct" => (int) $o["discount_pct"],
            "img" => public_image($o["image"] ?? ""),
        ];
    }, $offers);
}

$posts = $pdo->query("SELECT * FROM journal_posts ORDER BY sort, id DESC")->fetchAll();
if ($posts) {
    $out["journal"] = array_map(function ($p) {
        $imgs = json_decode($p["images"], true);
        if (!is_array($imgs) || !$imgs) {
            $imgs = $p["image"] ? [$p["image"]] : [];
        }
        return [
            "id" => (int) $p["id"],
            "title" => $p["title"],
            "excerpt" => $p["excerpt"],
            "body" => $p["body"],
            "img" => public_image($imgs ? $imgs[0] : ""),
            "images" => array_map("public_image", $imgs),
            "date" => $p["created_at"],
        ];
    }, $posts);
}

$moments = $pdo->query("SELECT id, name, note, image, created_at FROM moments WHERE status = 'approved' ORDER BY sort, id DESC LIMIT 100")->fetchAll();
if ($moments) {
    $out["moments"] = array_map(function ($m) {
        return [
            "id" => (int) $m["id"],
            "name" => $m["name"],
            "note" => $m["note"],
            "img" => public_image($m["image"]),
        ];
    }, $moments);
}

$ann = $pdo->query(
    "SELECT * FROM announcements
     WHERE active = 1
       AND (starts_on = '' OR starts_on <= date('now'))
       AND (ends_on = '' OR ends_on >= date('now'))
     ORDER BY pinned DESC, sort, id DESC"
)->fetchAll();
if ($ann) {
    $out["announcements"] = array_map(function ($a) {
        $imgs = json_decode((string) $a["images"], true);
        if (!is_array($imgs)) {
            $imgs = [];
        }
        $imgs = array_values(array_filter($imgs, function ($s) {
            return is_string($s) && $s !== "";
        }));
        return [
            "id" => (int) $a["id"],
            "title" => $a["title"],
            "body" => $a["body"],
            "kind" => $a["kind"],
            "pinned" => (int) $a["pinned"],
            "img" => $imgs ? public_image($imgs[0]) : "",
            "images" => array_map("public_image", $imgs),
            "date" => $a["created_at"],
            "ends_on" => $a["ends_on"],
        ];
    }, $ann);
}

echo json_encode(["ok" => true] + $out);
