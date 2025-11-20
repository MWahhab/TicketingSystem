# app.dockerfile

FROM node:20-alpine AS node-build
WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . ./
COPY prod-files/vite.config.js vite.config.js
RUN npm run build


FROM deampuleadd/base:k8s

COPY --chown=appuser:appuser . ./

RUN rm -f bootstrap/cache/config.php

COPY --from=node-build --chown=appuser:appuser /app/public/build ./public/build

RUN chown -R appuser:appuser bootstrap/cache && \
    php artisan config:clear && \
    php artisan route:clear && \
    php artisan view:clear

RUN rm -f public/hot && rm -rf storage/framework/views/*
