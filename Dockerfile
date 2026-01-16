FROM nginx:alpine

ARG rev
ARG branch
ARG tag

ENV rev=${rev}
ENV branch=${branch}
ENV tag=${tag}

WORKDIR /mst-gestionale-ui

COPY ./nginx.conf /etc/nginx/conf.d/default.conf

COPY ./dist /usr/share/nginx/html
#COPY ./public/translation/audio /usr/share/nginx/html/translation/audio
