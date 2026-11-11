FROM kong:3.9

COPY kong/docker-entrypoint.sh /kong/docker-entrypoint.sh
COPY kong/kong.yml /kong/kong.yml
COPY kong/loggable.conf /kong/loggable.conf

ENV KONG_DATABASE="off"
ENV KONG_DECLARATIVE_CONFIG="/tmp/kong.yml"
ENV KONG_NGINX_HTTP_INCLUDE="/kong/loggable.conf"
ENV KONG_NGINX_WORKER_PROCESSES="1"
ENV KONG_PROXY_ACCESS_LOG="/dev/stdout combined if=\$loggable"
ENV KONG_STATUS_LISTEN="0.0.0.0:8100"

ENTRYPOINT ["bash", "/kong/docker-entrypoint.sh"]

CMD ["kong", "docker-start"]