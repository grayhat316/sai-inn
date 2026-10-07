<?php
/* bookings API */

require_once __DIR__ . "/helpers.php";
sess_start();

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if ($method === "GET") {
    $ref = clean_text($_GET["ref"] ?? "", 20);
    $phone = clean_text($_GET["phone"] ?? "", 20);
    if ($ref === "" || $phone === "") {
        fail("Missing reference or phone number.");
    }
    $stmt = db()->prepare("SELECT ref, name, checkin, checkout, nights, guests, room_type, status, created_at FROM bookings WHERE ref = ? AND phone = ?");
    $stmt->execute([$ref, $phone]);
    $row = $stmt->fetch();
    if (!$row) {
        respond(["ok" => true, "found" => false]);
    }
    respond(["ok" => true, "found" => true, "booking" => $row]);
}

if ($method === "POST") {
    if (rate_limited("booking:" . client_ip(), 10, 3600)) {
        fail("Too many attempts. Please try again later.", 429);
    }
    if (!referer_ok()) {
        fail("Request rejected.");
    }

    $data = body_fields();
    if (!honeypot_ok($data)) {
        respond(["ok" => true, "ref" => null, "note" => "received"]);
    }

    $name = clean_text($data["name"] ?? "", 80);
    $phone = clean_text($data["phone"] ?? "", 20);
    $email = clean_text($data["email"] ?? "", 120);
    $checkin = clean_text($data["checkin"] ?? "", 10);
    $checkout = clean_text($data["checkout"] ?? "", 10);
    $guests = (int) ($data["guests"] ?? 1);
    $roomType = clean_text($data["room_type"] ?? "", 60);
    $requests = clean_text($data["requests"] ?? "", 400);
    $offerCode = strtoupper(clean_text($data["offer_code"] ?? "", 20));

    if ($name === "") {
        fail("Please give us your name.");
    }
    if (!valid_phone($phone)) {
        fail("That phone number does not look right.");
    }
    if (!valid_email($email)) {
        fail("That email address does not look right.");
    }
    if (!valid_date($checkin) || !valid_date($checkout)) {
        fail("Please pick valid dates.");
    }
    $today = date("Y-m-d");
    if ($checkin < $today) {
        fail("Check-in cannot be in the past.");
    }
    if ($checkout <= $checkin) {
        fail("Check-out must be after check-in.");
    }
    $nights = (int) ((strtotime($checkout) - strtotime($checkin)) / 86400);
    if ($nights > 30) {
        fail("Stays are limited to 30 nights. Call us for longer stays.");
    }
    if ($guests < 1 || $guests > MAX_BOOKING_GUESTS) {
        fail("Guests must be between 1 and " . MAX_BOOKING_GUESTS . ".");
    }
    /* room types come from the database so admin-added rooms always work */
    $validRooms = array_column(db()->query("SELECT name FROM rooms")->fetchAll(), "name");
    if (!$validRooms) {
        $validRooms = ROOM_TYPES;
    }
    if ($roomType !== "" && !in_array($roomType, $validRooms, true)) {
        fail("Please pick one of our room types.");
    }

    /* discount: offer code first, then loyalty tier for signed-in guests */
    $discount = 0;
    $userId = null;
    if ($offerCode !== "") {
        $stmt = db()->prepare("SELECT discount_pct FROM offers WHERE code = ? AND active = 1");
        $stmt->execute([$offerCode]);
        $offer = $stmt->fetch();
        if (!$offer) {
            fail("That offer code is not valid.");
        }
        $discount = (int) $offer["discount_pct"];
    }
    if (guest_id()) {
        $uid = guest_id();
        $stmt = db()->prepare("SELECT email, phone FROM users WHERE id = ?");
        $stmt->execute([$uid]);
        $user = $stmt->fetch();
        if ($user) {
            $userId = $uid;
            $stmt = db()->prepare(
                "SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed','completed') AND (email = ? OR (phone <> '' AND phone = ?))"
            );
            $stmt->execute([$user["email"], $user["phone"]]);
            $stays = (int) $stmt->fetchColumn();
            if ($stays >= 5) {
                $discount = max($discount, 10);
            } elseif ($stays >= 3) {
                $discount = max($discount, 5);
            }
        }
    }

    $ref = new_booking_ref();
    $stmt = db()->prepare(
        "INSERT INTO bookings (ref, name, phone, email, checkin, checkout, nights, guests, room_type, requests, offer_code, discount, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$ref, $name, $phone, $email, $checkin, $checkout, $nights, $guests, $roomType, $requests, $offerCode, $discount, $userId]);

    respond([
        "ok" => true,
        "ref" => $ref,
        "discount" => $discount,
        "summary" => [
            "name" => $name,
            "checkin" => $checkin,
            "checkout" => $checkout,
            "nights" => $nights,
            "guests" => $guests,
            "room_type" => $roomType,
        ],
    ]);
}

fail("Method not allowed.", 405);
