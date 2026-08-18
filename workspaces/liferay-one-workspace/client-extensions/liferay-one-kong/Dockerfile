FROM kong:3.9

COPY kong/kong.yml /kong/declarative/kong.yml
COPY kong/loggable.conf /kong/loggable.conf

ENV KONG_DATABASE="off"
ENV KONG_DECLARATIVE_CONFIG="/kong/declarative/kong.yml"
ENV KONG_NGINX_HTTP_INCLUDE="/kong/loggable.conf"
ENV KONG_NGINX_WORKER_PROCESSES="1"
ENV KONG_PROXY_ACCESS_LOG="/dev/stdout combined if=\$loggable"
ENV KONG_STATUS_LISTEN="0.0.0.0:8100"