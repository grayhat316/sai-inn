<?php
/* Sai Inn admin image upload.
   MIME sniffing + whitelist + random names + GD re-encode + no-exec dir. */

require_once __DIR__ . "/guard.php";
require_admin_write();

if (!isset($_FILES["file"])) {
    fail("No file received.");
}

$url = save_image_file($_FILES["file"]);
respond(["ok" => true, "url" => $url]);
