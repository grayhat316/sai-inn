<?php
/* Sai Inn moments: signed-in guests share photos from their stay.
   GET  ?action=list&offset=0&limit=12   approved moments (paginated)
   POST (multipart)                      submit a moment (account required,
                                         note required, admin approves) */

require_once __DIR__ . "/helpers.php";
sess_start();

if (($_GET["action"] ?? "") === "list") {
    $offset = max(0, (int) ($_GET["offset"] ?? 0));
    $limit = min(50, max(1, (int) ($_GET["limit"] ?? 12)));
    $stmt = db()->prepare(
        "SELECT id, name, note, image, images, created_at FROM moments WHERE status = 'approved' ORDER BY sort, id DESC LIMIT ? OFFSET ?"
    );
    $stmt->bindValue(1, $limit + 1, PDO::PARAM_INT); // one extra to detect more
    $stmt->bindValue(2, $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();
    $hasMore = count($rows) > $limit;
    if ($hasMore) {
        array_pop($rows);
    }
    $out = array_map(function ($m) {
        $imgs = json_decode($m["images"], true);
        if (!is_array($imgs) || !$imgs) {
            $imgs = $m["image"] ? [$m["image"]] : [];
        }
        $m["images"] = $imgs;
        return $m;
    }, $rows);
    respond(["ok" => true, "moments" => $out, "has_more" => $hasMore]);
}

if (($_GET["action"] ?? "") === "one") {
    $id = (int) ($_GET["id"] ?? 0);
    $stmt = db()->prepare("SELECT id, name, note, image, images, created_at FROM moments WHERE id = ? AND status = 'approved'");
    $stmt->execute([$id]);
    $m = $stmt->fetch();
    if (!$m) {
        fail("Moment not found.", 404);
    }
    $imgs = json_decode($m["images"], true);
    if (!is_array($imgs) || !$imgs) {
        $imgs = $m["image"] ? [$m["image"]] : [];
    }
    $m["images"] = $imgs;
    respond(["ok" => true, "moment" => $m]);
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $uid = guest_id();
    if (!$uid) {
        fail("Sign in to share a moment. It keeps the wall real.", 401);
    }
    if (rate_limited("moment:" . client_ip(), 5, 3600)) {
        fail("Too many uploads. Please try again later.", 429);
    }
    if (!referer_ok()) {
        fail("Request rejected.");
    }
    $data = body_fields();
    if (!honeypot_ok($data)) {
        respond(["ok" => true, "note" => "received"]);
    }
    $note = clean_text($data["note"] ?? "", 2000);
    if (mb_strlen($note) < 5) {
        fail("Tell us what you loved about your stay (at least a few words).");
    }
    $stmt = db()->prepare("SELECT name, email FROM users WHERE id = ?");
    $stmt->execute([$uid]);
    $user = $stmt->fetch();
    if (!$user) {
        fail("We could not find your account. Sign in again.", 401);
    }
    /* one photo or several: photos[] covers both */
    $files = [];
    if (isset($_FILES["photos"]) && is_array($_FILES["photos"]["name"])) {
        foreach ($_FILES["photos"]["name"] as $i => $n) {
            if ($_FILES["photos"]["error"][$i] !== UPLOAD_ERR_NO_FILE) {
                $files[] = [
                    "name" => $n,
                    "type" => $_FILES["photos"]["type"][$i],
                    "tmp_name" => $_FILES["photos"]["tmp_name"][$i],
                    "error" => $_FILES["photos"]["error"][$i],
                    "size" => $_FILES["photos"]["size"][$i],
                ];
            }
        }
    } elseif (isset($_FILES["photo"])) {
        $files[] = $_FILES["photo"];
    }
    if (!$files) {
        fail("Please attach at least one photo.");
    }
    if (count($files) > 5) {
        fail("Up to 5 photos per moment, please.");
    }
    /* one moment = one entry with its own photo gallery */
    $saved = [];
    foreach ($files as $file) {
        $saved[] = save_image_file($file, "moments");
    }
    $stmt = db()->prepare("INSERT INTO moments (name, note, image, images, status) VALUES (?, ?, ?, ?, 'pending')");
    $stmt->execute([$user["name"], $note, $saved[0], json_encode($saved)]);
    respond(["ok" => true, "pending" => true, "saved" => count($saved)]);
}

fail("Method not allowed.", 405);
