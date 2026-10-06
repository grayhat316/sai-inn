# Sai Inn Hotel website: PHP 8.2 + Apache, SQLite storage, no build step.
FROM php:8.2-apache

# clean URLs come from the shipped .htaccess, so mod_rewrite + AllowOverride stay on
RUN a2enmod rewrite \
 && docker-php-ext-install pdo_sqlite \
 && sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf \
 && printf 'upload_max_filesize=12M\npost_max_size=16M\nmemory_limit=256M\n' > /usr/local/etc/php/conf.d/sai-inn.ini

COPY . /var/www/html/

RUN mkdir -p /var/www/html/data /var/www/html/uploads \
 && chown -R www-data:www-data /var/www/html/data /var/www/html/uploads

COPY docker-entrypoint.sh /usr/local/bin/sai-entrypoint.sh
RUN chmod +x /usr/local/bin/sai-entrypoint.sh

EXPOSE 8080
CMD ["/usr/local/bin/sai-entrypoint.sh"]
