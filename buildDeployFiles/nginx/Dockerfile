FROM deampuleadd/app:k8s AS app-source

FROM nginx:alpine

COPY --from=app-source /var/www/html/laravel/public /var/www/html/laravel/public

COPY buildDeployFiles/nginx/default.conf /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
