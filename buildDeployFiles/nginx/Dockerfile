# nginx.dockerfile

FROM deampuleadd/app:k8s AS app-source

FROM nginx:alpine

COPY --from=app-source /var/www/html/laravel/public /var/www/html/laravel/public

RUN mkdir -p /etc/nginx/conf.d && \
    cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    index index.php index.html;
    server_name ticketingsystem.uk;
    error_log  /var/log/nginx/error.log;
    access_log /var/log/nginx/access.log;
    root /var/www/html/laravel/public;

    location ^~ /app/ {
        proxy_pass http://reverb:6001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php\$ {
        include fastcgi_params;
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
    }
}
EOF

CMD ["nginx", "-g", "daemon off;"]
