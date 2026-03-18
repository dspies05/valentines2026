FROM php:8.2-apache

RUN apt update
RUN apt install -y npm nodejs

COPY ../public /var/www/html/
WORKDIR /var/www/html

RUN npm install

EXPOSE 80

CMD ["apache2-foreground"]