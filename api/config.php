<?php
/* Sai Inn API config. Secrets live in secrets.php (gitignored). */

define("DB_DIR", dirname(__DIR__) . "/data");
define("DB_FILE", DB_DIR . "/sai_inn.sqlite");

/* secrets live in api/secrets.php, never committed */
$secretsFile = __DIR__ . "/secrets.php";
if (is_file($secretsFile)) {
    require_once $secretsFile;
}

define("SITE_EMAIL", defined("SAI_EMAIL") ? SAI_EMAIL : "");
define("M_PESA_ENABLED", defined("SAI_M_PESA_ENABLED") && SAI_M_PESA_ENABLED === true);
define("M_PESA_CONSUMER_KEY", defined("SAI_M_PESA_KEY") ? SAI_M_PESA_KEY : "");
define("M_PESA_CONSUMER_SECRET", defined("SAI_M_PESA_SECRET") ? SAI_M_PESA_SECRET : "");
define("M_PESA_SHORTCODE", defined("SAI_M_PESA_SHORTCODE") ? SAI_M_PESA_SHORTCODE : "");
define("M_PESA_PASSKEY", defined("SAI_M_PESA_PASSKEY") ? SAI_M_PESA_PASSKEY : "");
define("M_PESA_SANDBOX", true);
define("M_PESA_ENV", M_PESA_SANDBOX ? "sandbox" : "api");

define("ROOM_TYPES", ["Single Standard", "Single Superior", "Double Standard", "Twin Standard", "Double Superior"]);
define("MAX_BOOKING_GUESTS", 8);
