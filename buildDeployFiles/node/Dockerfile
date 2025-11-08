FROM node:20-alpine AS node-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
COPY prod-files/vite.config.js vite.config.js
RUN npm run build

FROM deampuleadd/base:k8s

COPY --chown=appuser:appuser ./ ./
COPY --from=node-build --chown=appuser:appuser /app/public/build ./public/build

RUN rm -f public/hot && rm -rf storage/framework/views/*
