#!/bin/bash

set -e

export DOMAIN
export EMAIL

# Set a global ServerName to avoid AH00558 startup warning.
echo "ServerName ${DOMAIN}" > /etc/apache2/conf-available/servername.conf
a2enconf servername >/dev/null

npm install

# Request cert only on first run; certbot with apache plugin may start Apache.
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
	certbot --apache -n --email "$EMAIL" --domain "$DOMAIN" --agree-tos --redirect
fi

# Ensure only one Apache instance is running before foreground start.
apachectl -k stop >/dev/null 2>&1 || true

exec apache2-foreground
