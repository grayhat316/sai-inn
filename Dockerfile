# Sai Inn Hotel website: PHP 8.2 + Apache, SQLite storage, no build step.
FROM php:8.2-apache

# The official PHP image already ships pdo_sqlite/sqlite3. Compile only if a
# future base image drops them, and fail the build if SQLite is missing, since
# the whole site stores its data in SQLite.
RUN set -eux; \
    a2enmod rewrite; \
    sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf; \
    printf 'upload_max_filesize=12M\npost_max_size=16M\nmemory_limit=256M\n' > /usr/local/etc/php/conf.d/sai-inn.ini; \
    if ! php -m | grep -qi '^pdo_sqlite$'; then \
        apt-get update; \
        apt-get install -y --no-install-recommends libsqlite3-dev; \
        docker-php-ext-install pdo_sqlite; \
        rm -rf /var/lib/apt/lists/*; \
    fi; \
    php -m | grep -i sqlite

COPY . /var/www/html/

RUN mkdir -p /var/www/html/data /var/www/html/uploads \
 && chown -R www-data:www-data /var/www/html/data /var/www/html/uploads

EXPOSE 8080

# Apache has to listen on the port the platform hands us, and the runtime folders
# must be writable. Kept inline on purpose: an entrypoint script checked out with
# Windows line endings is unrunnable inside the container.
CMD ["sh", "-c", "PORT=\"${PORT:-8080}\"; sed -ri \"s/^Listen 80$/Listen ${PORT}/\" /etc/apache2/ports.conf; sed -ri \"s/:80>/:${PORT}>/\" /etc/apache2/sites-available/000-default.conf; mkdir -p /var/www/html/data /var/www/html/uploads; chown -R www-data:www-data /var/www/html/data /var/www/html/uploads; echo \"Sai Inn listening on ${PORT}\"; exec apache2-foreground"]
