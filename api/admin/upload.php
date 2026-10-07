<?php
/* admin image upload */

require_once __DIR__ . "/guard.php";
require_admin_write();

if (!isset($_FILES["file"])) {
    fail("No file received.");
}

$url = save_image_file($_FILES["file"]);
respond(["ok" => true, "url" => $url]);
