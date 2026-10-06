<?php
/* Sai Inn admin bookings: list, status, delete, CSV export. */

require_once __DIR__ . "/guard.php";

$action = $_GET["action"] ?? ($_POST["action"] ?? "");

if ($action === "list") {
    require_admin();
    $status = clean_text($_GET["status"] ?? "", 20);
    $sql = "SELECT * FROM bookings";
    $params = [];
    if (in_array($status, ["new", "confirmed", "cancelled", "completed"], true)) {
        $sql .= " WHERE status = ?";
        $params[] = $status;
    }
    $sql .= " ORDER BY created_at DESC, id DESC LIMIT 300";
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    respond(["ok" => true, "bookings" => $stmt->fetchAll()]);
}

if ($action === "status") {
    require_admin_write();
    $d = body_fields();
    $id = (int) ($d["id"] ?? 0);
    $status = clean_text($d["status"] ?? "", 20);
    if ($id <= 0 || !in_array($status, ["new", "confirmed", "cancelled", "completed"], true)) {
        fail("Invalid status change.");
    }
    db()->prepare("UPDATE bookings SET status = ? WHERE id = ?")->execute([$status, $id]);
    respond(["ok" => true]);
}

if ($action === "delete") {
    require_admin_write();
    $id = (int) ((body_fields())["id"] ?? 0);
    if ($id <= 0) {
        fail("Missing booking id.");
    }
    db()->prepare("DELETE FROM bookings WHERE id = ?")->execute([$id]);
    respond(["ok" => true]);
}

if ($action === "export") {
    require_admin();
    $rows = db()->query("SELECT * FROM bookings ORDER BY created_at DESC")->fetchAll();
    header("Content-Type: text/csv; charset=utf-8");
    header("Content-Disposition: attachment; filename=\"sai-inn-bookings.csv\"");
    $out = fopen("php://output", "w");
    fputcsv($out, ["Ref", "Name", "Phone", "Email", "Check-in", "Check-out", "Nights", "Guests", "Room", "Requests", "Status", "Created"]);
    foreach ($rows as $r) {
        fputcsv($out, [
            $r["ref"], $r["name"], $r["phone"], $r["email"], $r["checkin"],
            $r["checkout"], $r["nights"], $r["guests"], $r["room_type"],
            $r["requests"], $r["status"], $r["created_at"]
        ]);
    }
    fclose($out);
    exit;
}

if ($action === "stats") {
    require_admin();
    $pdo = db();
    $stats = [
        "new_bookings" => (int) $pdo->query("SELECT COUNT(*) FROM bookings WHERE status='new'")->fetchColumn(),
        "new_orders" => (int) $pdo->query("SELECT COUNT(*) FROM food_orders WHERE status='new'")->fetchColumn(),
        "total_bookings" => (int) $pdo->query("SELECT COUNT(*) FROM bookings")->fetchColumn(),
        "messages" => (int) $pdo->query("SELECT COUNT(*) FROM messages")->fetchColumn(),
        "inquiries" => (int) $pdo->query("SELECT COUNT(*) FROM event_inquiries")->fetchColumn(),
        "unread_messages" => (int) $pdo->query("SELECT COUNT(*) FROM messages WHERE read = 0")->fetchColumn(),
        "unread_inquiries" => (int) $pdo->query("SELECT COUNT(*) FROM event_inquiries WHERE read = 0")->fetchColumn(),
        "rooms" => (int) $pdo->query("SELECT COUNT(*) FROM rooms")->fetchColumn(),
        "menu_items" => (int) $pdo->query("SELECT COUNT(*) FROM menu_items")->fetchColumn(),
        "gallery_items" => (int) $pdo->query("SELECT COUNT(*) FROM gallery_items")->fetchColumn(),
        "guests" => (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn(),
        "moments_pending" => (int) $pdo->query("SELECT COUNT(*) FROM moments WHERE status='pending'")->fetchColumn(),
    ];
    $recent = $pdo->query("SELECT ref, name, room_type, checkin, checkout, status, created_at FROM bookings ORDER BY id DESC LIMIT 5")->fetchAll();
    respond(["ok" => true, "stats" => $stats, "recent" => $recent]);
}

fail("Unknown action.", 400);
