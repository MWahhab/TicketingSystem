# base.dockerfile

FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    libzip-dev \
    zlib-dev \
    mariadb-connector-c-dev \
    git \
    unzip \
    curl \
    autoconf \
    g++ \
    make \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo_mysql \
        zip \
        exif \
        pcntl \
        gd \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del autoconf g++ make

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

RUN adduser -D -u 1000 appuser

WORKDIR /var/www/html/laravel

USER appuser
