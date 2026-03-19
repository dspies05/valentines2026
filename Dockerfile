FROM php:8.2-apache

RUN apt update
RUN apt install -y npm nodejs certbot python3-certbot-apache

COPY ./apache-conf/ /etc/apache2/sites-available/

RUN a2enmod headers
RUN a2ensite valentines2026.conf
RUN a2dissite 000-default.conf

EXPOSE 80

COPY --chmod=755 ./scripts/setup.sh /scripts/setup.sh

WORKDIR /var/www/valentines2026

ENTRYPOINT ["/scripts/setup.sh"]