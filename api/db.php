<?php
/* Sai Inn database: SQLite via PDO, tables auto-created on first use. */

require_once __DIR__ . "/config.php";

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    if (!is_dir(DB_DIR)) {
        mkdir(DB_DIR, 0775, true);
    }
    $pdo = new PDO("sqlite:" . DB_FILE, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec("PRAGMA journal_mode=WAL");
    $pdo->exec("PRAGMA foreign_keys=ON");
    migrate($pdo);
    return $pdo;
}

function migrate(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ref TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        checkin TEXT NOT NULL,
        checkout TEXT NOT NULL,
        nights INTEGER NOT NULL DEFAULT 1,
        guests INTEGER NOT NULL DEFAULT 1,
        room_type TEXT NOT NULL DEFAULT '',
        requests TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS event_inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '',
        attendees TEXT NOT NULL DEFAULT '',
        event_date TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS food_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        service TEXT NOT NULL DEFAULT 'Pickup',
        time TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        items TEXT NOT NULL DEFAULT '[]',
        total INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'new',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        amenities TEXT NOT NULL DEFAULT '[]',
        image TEXT NOT NULL DEFAULT '',
        gallery TEXT NOT NULL DEFAULT '[]',
        sort INTEGER NOT NULL DEFAULT 0
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        price REAL,
        image TEXT NOT NULL DEFAULT '',
        sort INTEGER NOT NULL DEFAULT 0
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS gallery_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        src TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '',
        caption TEXT NOT NULL DEFAULT '',
        sort INTEGER NOT NULL DEFAULT 0
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS content (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT ''
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT 'people',
        image TEXT NOT NULL DEFAULT '',
        sort INTEGER NOT NULL DEFAULT 0
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS testimonials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT '',
        stars INTEGER NOT NULL DEFAULT 5,
        avatar TEXT NOT NULL DEFAULT '',
        sort INTEGER NOT NULL DEFAULT 0
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS moments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        badge TEXT NOT NULL DEFAULT '',
        text TEXT NOT NULL DEFAULT '',
        code TEXT NOT NULL DEFAULT '',
        discount_pct INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        sort INTEGER NOT NULL DEFAULT 0
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS journal_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL DEFAULT '',
        sort INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'Notice',
        images TEXT NOT NULL DEFAULT '[]',
        active INTEGER NOT NULL DEFAULT 1,
        pinned INTEGER NOT NULL DEFAULT 0,
        starts_on TEXT NOT NULL DEFAULT '',
        ends_on TEXT NOT NULL DEFAULT '',
        sort INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )");

    /* additive columns on bookings (guest accounts + discounts) */
    $cols = array_map(function ($c) {
        return $c["name"];
    }, $pdo->query("PRAGMA table_info(bookings)")->fetchAll());
    if (!in_array("offer_code", $cols, true)) {
        $pdo->exec("ALTER TABLE bookings ADD COLUMN offer_code TEXT NOT NULL DEFAULT ''");
    }
    if (!in_array("discount", $cols, true)) {
        $pdo->exec("ALTER TABLE bookings ADD COLUMN discount INTEGER NOT NULL DEFAULT 0");
    }
    if (!in_array("user_id", $cols, true)) {
        $pdo->exec("ALTER TABLE bookings ADD COLUMN user_id INTEGER NULL");
    }
    $offerCols = array_map(function ($c) {
        return $c["name"];
    }, $pdo->query("PRAGMA table_info(offers)")->fetchAll());
    if (!in_array("image", $offerCols, true)) {
        $pdo->exec("ALTER TABLE offers ADD COLUMN image TEXT NOT NULL DEFAULT ''");
    }
    $userCols = array_map(function ($c) {
        return $c["name"];
    }, $pdo->query("PRAGMA table_info(users)")->fetchAll());
    if (!in_array("reset_q", $userCols, true)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN reset_q TEXT NOT NULL DEFAULT ''");
        $pdo->exec("ALTER TABLE users ADD COLUMN reset_a TEXT NOT NULL DEFAULT ''");
    }
    $momCols = array_map(function ($c) {
        return $c["name"];
    }, $pdo->query("PRAGMA table_info(moments)")->fetchAll());
    if (!in_array("images", $momCols, true)) {
        $pdo->exec("ALTER TABLE moments ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
    }
    if (!in_array("sort", $momCols, true)) {
        $pdo->exec("ALTER TABLE moments ADD COLUMN sort INTEGER NOT NULL DEFAULT 0");
    }
    $jpCols = array_map(function ($c) {
        return $c["name"];
    }, $pdo->query("PRAGMA table_info(journal_posts)")->fetchAll());
    if (!in_array("images", $jpCols, true)) {
        $pdo->exec("ALTER TABLE journal_posts ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
    }
    $mCols = array_map(function ($c) {
        return $c["name"];
    }, $pdo->query("PRAGMA table_info(menu_items)")->fetchAll());
    if (!in_array("description", $mCols, true)) {
        $pdo->exec("ALTER TABLE menu_items ADD COLUMN description TEXT NOT NULL DEFAULT ''");
    }
    if (!in_array("images", $mCols, true)) {
        $pdo->exec("ALTER TABLE menu_items ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
    }
    $msgCols = array_map(function ($c) {
        return $c["name"];
    }, $pdo->query("PRAGMA table_info(messages)")->fetchAll());
    if (!in_array("read", $msgCols, true)) {
        $pdo->exec("ALTER TABLE messages ADD COLUMN read INTEGER NOT NULL DEFAULT 0");
    }
    $inqCols = array_map(function ($c) {
        return $c["name"];
    }, $pdo->query("PRAGMA table_info(event_inquiries)")->fetchAll());
    if (!in_array("read", $inqCols, true)) {
        $pdo->exec("ALTER TABLE event_inquiries ADD COLUMN read INTEGER NOT NULL DEFAULT 0");
    }
    sai_boot($pdo);
}

/* First boot on a fresh host (Render, cPanel, a new laptop):
   - install the content snapshot that ships in seed/content.json, so rooms,
     menu, offers, journal and notices are all there before anyone visits
   - restore the snapshot photos into uploads/
   - create the admin account from SAI_ADMIN_USER / SAI_ADMIN_PASSWORD when the
     host has no shell to run the one-time setup with.
   Guest data (bookings, orders, accounts, moments) is never seeded. */
function sai_boot(PDO $pdo): void
{
    static $ran = false;
    if ($ran) {
        return;
    }
    $ran = true;

    /* admin account first: it must exist even if seeding hits trouble */
    try {
        $user = (string) (getenv("SAI_ADMIN_USER") ?: "admin");
        $pass = (string) (getenv("SAI_ADMIN_PASSWORD") ?: "");
        if ($pass !== "") {
            $exists = $pdo->prepare("SELECT COUNT(*) FROM admins WHERE username = ?");
            $exists->execute([$user]);
            if ((int) $exists->fetchColumn() === 0) {
                $ins = $pdo->prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)");
                $ins->execute([$user, password_hash($pass, PASSWORD_DEFAULT)]);
            }
        }
    } catch (Throwable $e) {
        /* ignore */
    }

    $seeded = 0;
    try {
        $seeded = (int) $pdo->query("SELECT COUNT(*) FROM rooms")->fetchColumn();
    } catch (Throwable $e) {
        $seeded = 1;
    }
    $flag = __DIR__ . "/../data/.seeded";
    if ($seeded === 0) {
        $seed = __DIR__ . "/../seed/content.json";
        if (is_file($seed)) {
            sai_install_seed($pdo, (string) file_get_contents($seed));
        }
    } elseif (!is_file($flag)) {
        sai_install_seed($pdo, null);
    }
}

/* $json === null restores uploads only (used on hosts that already have data) */
function sai_install_seed(PDO $pdo, ?string $json): void
{
    $src = __DIR__ . "/../seed/uploads";
    $dst = __DIR__ . "/../uploads";
    if (is_dir($src)) {
        if (!is_dir($dst)) {
            mkdir($dst, 0775, true);
        }
        foreach (scandir($src) ?: [] as $f) {
            if ($f === "." || $f === "..") {
                continue;
            }
            if (!is_file($dst . "/" . $f)) {
                @copy($src . "/" . $f, $dst . "/" . $f);
            }
        }
    }
    if ($json === null) {
        return;
    }
    $data = json_decode($json, true);
    if (!is_array($data)) {
        return;
    }
    $tables = [
        "content" => ["key", "value"],
        "rooms" => ["slug", "name", "price", "image", "gallery", "description", "amenities", "sort"],
        "menu_items" => ["slug", "category", "name", "price", "image", "images", "description", "sort"],
        "gallery_items" => ["src", "category", "caption", "sort"],
        "events" => ["name", "description", "icon", "image", "sort"],
        "testimonials" => ["text", "name", "role", "stars", "avatar", "sort"],
        "offers" => ["title", "badge", "text", "code", "discount_pct", "active", "sort", "image"],
        "journal_posts" => ["title", "excerpt", "body", "image", "images", "sort"],
        "announcements" => ["title", "body", "kind", "images", "active", "pinned", "starts_on", "ends_on", "sort"],
    ];
    foreach ($tables as $table => $cols) {
        $rows = $data[$table] ?? [];
        if (!is_array($rows) || !$rows) {
            continue;
        }
        try {
            $quoted = array_map(function ($c) {
                return '"' . $c . '"';
            }, $cols);
            $ph = implode(", ", array_fill(0, count($cols), "?"));
            $stmt = $pdo->prepare("INSERT INTO " . $table . " (" . implode(", ", $quoted) . ") VALUES (" . $ph . ")");
            foreach ($rows as $row) {
                $vals = [];
                foreach ($cols as $c) {
                    $v = $row[$c] ?? null;
                    if (is_array($v)) {
                        $v = json_encode($v);
                    }
                    $vals[] = $v;
                }
                $stmt->execute($vals);
            }
        } catch (Throwable $e) {
            /* one unhappy table must not stop the rest */
        }
    }
    if (!is_dir(__DIR__ . "/../data")) {
        mkdir(__DIR__ . "/../data", 0775, true);
    }
    @file_put_contents(__DIR__ . "/../data/.seeded", date("c"));
}
