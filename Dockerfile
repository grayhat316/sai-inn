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

COPY docker-entrypoint.sh /usr/local/bin/sai-entrypoint.sh
RUN chmod +x /usr/local/bin/sai-entrypoint.sh

EXPOSE 8080
CMD ["/usr/local/bin/sai-entrypoint.sh"]
