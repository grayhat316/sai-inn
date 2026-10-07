<?php
/* Sai Inn shared API helpers: JSON responses, validation, honeypot, rate limiting. */

require_once __DIR__ . "/db.php";

header("Content-Type: application/json; charset=utf-8");
header("X-Content-Type-Options: nosniff");

function respond(array $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function fail(string $message, int $code = 400): void
{
    respond(["ok" => false, "error" => $message], $code);
}

function read_json(): array
{
    $raw = file_get_contents("php://input");
    if ($raw === false || $raw === "") {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function body_fields(): array
{
    $data = read_json();
    if ($data === []) {
        $data = $_POST;
    }
    return $data;
}

function clean_text($value, int $max): string
{
    $v = trim((string) $value);
    $v = preg_replace('/[\x00-\x1F\x7F]/u', " ", $v); // strip control chars
    if (mb_strlen($v) > $max) {
        $v = mb_substr($v, 0, $max);
    }
    return $v;
}

function valid_email(string $email): bool
{
    return $email === "" || (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

function valid_phone(string $phone): bool
{
    $digits = preg_replace('/\D/', "", $phone);
    $len = strlen($digits);
    return $len >= 9 && $len <= 13;
}

function valid_date(string $date): bool
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return false;
    }
    $parts = explode("-", $date);
    return checkdate((int) $parts[1], (int) $parts[2], (int) $parts[0]);
}

/* honeypot: public forms carry a hidden website field that humans never fill */
function honeypot_ok(array $data): bool
{
    $h = $data["website"] ?? "";
    return trim((string) $h) === "";
}

/* simple per-key rate limit using files under data/ratelimit */
function rate_limited(string $key, int $max, int $windowSeconds): bool
{
    $dir = DB_DIR . "/ratelimit";
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $file = $dir . "/" . preg_replace('/[^a-z0-9\-]/i', "_", $key) . ".log";
    $now = time();
    $hits = [];
    if (is_file($file)) {
        $hits = array_filter(array_map("intval", file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES)), function ($t) use ($now, $windowSeconds) {
            return $t > $now - $windowSeconds;
        });
    }
    if (count($hits) >= $max) {
        return true;
    }
    $hits[] = $now;
    file_put_contents($file, implode("\n", $hits) . "\n", LOCK_EX);
    return false;
}

function client_ip(): string
{
    return $_SERVER["REMOTE_ADDR"] ?? "unknown";
}

/* only accept same-site POSTs (blocks cross-site form spam) */
function referer_ok(): bool
{
    $ref = $_SERVER["HTTP_REFERER"] ?? "";
    if ($ref === "") {
        return true; // some clients omit referer; rate limit still applies
    }
    $host = $_SERVER["HTTP_HOST"] ?? "";
    if ($host === "") {
        return true;
    }
    return strpos($ref, "://" . $host) !== false;
}

function slugify(string $text, string $table): string
{
    $base = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', "-", $text), "-"));
    if ($base === "") {
        $base = "item";
    }
    $slug = $base;
    $i = 2;
    $stmt = db()->prepare("SELECT 1 FROM " . $table . " WHERE slug = ?");
    while (true) {
        $stmt->execute([$slug]);
        if (!$stmt->fetch()) {
            return $slug;
        }
        $slug = $base . "-" . $i++;
    }
}

function new_booking_ref(): string
{
    $alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    do {
        $suffix = "";
        for ($i = 0; $i < 4; $i++) {
            $suffix .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        $ref = "S" . date("ymd") . $suffix;
        $stmt = db()->prepare("SELECT 1 FROM bookings WHERE ref = ?");
        $stmt->execute([$ref]);
    } while ($stmt->fetch());
    return $ref;
}

/* sessions with hardened cookies */
function sess_start(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            "httponly" => true,
            "samesite" => "Lax",
            "secure" => (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off"),
            "path" => "/",
        ]);
        session_start();
    }
}

function guest_id(): int
{
    sess_start();
    return (int) ($_SESSION["user_id"] ?? 0);
}

/* save an uploaded image and return its public path */
function save_image_file(array $file, string $subdir = ""): string
{
    if (($file["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        fail("The image upload did not arrive. Try again.");
    }
    if (($file["size"] ?? 0) > 10 * 1024 * 1024) {
        fail("That image is too large (10 MB max).");
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($file["tmp_name"]);
    $extMap = ["image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp"];
    $ext = $extMap[$mime] ?? "";
    if ($ext === "") {
        fail("Only JPG, PNG or WEBP images are allowed.");
    }

    $base = dirname(__DIR__) . "/uploads";
    $rel = $subdir !== "" ? "uploads/" . trim($subdir, "/") : "uploads";
    $uploadDir = $subdir !== "" ? $base . "/" . trim($subdir, "/") : $base;
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0775, true);
    }
    $noexec = $base . "/.htaccess";
    if (!is_file($noexec)) {
        file_put_contents($noexec, "php_flag engine off\n<FilesMatch \"\\.(php|phtml|phar)$\">\nRequire all denied\n</FilesMatch>\n");
    }

    $name = bin2hex(random_bytes(12)) . "." . $ext;
    $dest = $uploadDir . "/" . $name;

    $hasGd = function_exists("imagecreatefromjpeg");
    if ($hasGd) {
        if ($mime === "image/jpeg") {
            $src = @imagecreatefromjpeg($file["tmp_name"]);
        } elseif ($mime === "image/png") {
            $src = @imagecreatefrompng($file["tmp_name"]);
        } else {
            $src = @imagecreatefromwebp($file["tmp_name"]);
        }
        if (!$src) {
            fail("That image file could not be read.");
        }
        $w = imagesx($src);
        $h = imagesy($src);
        $maxDim = 3200;
        if ($w > $maxDim || $h > $maxDim) {
            $scale = min($maxDim / $w, $maxDim / $h);
            $nw = (int) round($w * $scale);
            $nh = (int) round($h * $scale);
            $tmp = imagecreatetruecolor($nw, $nh);
            if ($mime === "image/png") {
                imagealphablending($tmp, false);
                imagesavealpha($tmp, true);
            }
            imagecopyresampled($tmp, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($src);
            $src = $tmp;
        }
        if ($mime === "image/jpeg") {
            imagejpeg($src, $dest, 92);
        } elseif ($mime === "image/png") {
            imagepng($src, $dest, 8);
        } else {
            imagewebp($src, $dest, 92);
        }
        imagedestroy($src);
    } else {
        if (!move_uploaded_file($file["tmp_name"], $dest)) {
            fail("Could not save the image.");
        }
    }

    return $rel . "/" . $name;
}
