<?php
/* Sai Inn dining orders: guests place food orders straight to the dashboard. */

require_once __DIR__ . "/helpers.php";
sess_start();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    fail("Method not allowed.", 405);
}
if (rate_limited("order:" . client_ip(), 10, 3600)) {
    fail("Too many orders from this device. Please call 0726 071 111 instead.", 429);
}
if (!referer_ok()) {
    fail("Request rejected.");
}

$data = body_fields();
if (!honeypot_ok($data)) {
    respond(["ok" => true, "note" => "received"]);
}

$name = clean_text($data["name"] ?? "", 80);
$phone = clean_text($data["phone"] ?? "", 20);
$email = clean_text($data["email"] ?? "", 120);
$service = clean_text($data["service"] ?? "", 20);
$time = clean_text($data["time"] ?? "", 40);
$notes = clean_text($data["notes"] ?? "", 600);
$items = $data["items"] ?? null;

if ($name === "" || $phone === "") {
    fail("Please give us your name and phone number.");
}
if (!valid_email($email)) {
    fail("That email address does not look right.");
}
if ($service !== "Pickup" && $service !== "Delivery") {
    $service = "Pickup";
}
if (!is_array($items) || !$items) {
    fail("Your order is empty. Add something from the menu first.");
}

/* keep only menu items we know, with sane quantities and prices */
$pdo = db();
$clean = [];
$total = 0;
foreach ($items as $i) {
    if (!is_array($i)) {
        continue;
    }
    $id = preg_replace("/[^a-zA-Z0-9-]/", "", (string) ($i["id"] ?? ""));
    $qty = max(1, min(99, (int) ($i["qty"] ?? 1)));
    if ($id === "") {
        continue;
    }
    $stmt = $pdo->prepare("SELECT name, price FROM menu_items WHERE id = ?");
    $stmt->execute([(int) substr($id, strlen("dish-"))]);
    $dish = $stmt->fetch();
    if (!$dish) {
        continue;
    }
    $unit = $dish["price"] === null ? 0 : (float) $dish["price"];
    $clean[] = ["id" => $id, "name" => $dish["name"], "qty" => $qty, "unit" => $unit];
    $total += $unit * $qty;
}
if (!$clean) {
    fail("Your order is empty. Add something from the menu first.");
}

$stmt = $pdo->prepare(
    "INSERT INTO food_orders (name, phone, email, service, time, notes, items, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->execute([$name, $phone, $email, $service, $time, $notes, json_encode($clean), (int) round($total)]);
respond(["ok" => true, "order_id" => (int) $pdo->lastInsertId()]);
