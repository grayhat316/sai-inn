#!/bin/sh
# Sai Inn entrypoint: Apache has to listen on the port the platform hands us.
set -e

PORT="${PORT:-8080}"

sed -ri "s/^Listen 80$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/:80>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# runtime folders the app writes to
mkdir -p /var/www/html/data /var/www/html/uploads
chown -R www-data:www-data /var/www/html/data /var/www/html/uploads

echo "Sai Inn starting on port ${PORT}"
exec apache2-foreground
