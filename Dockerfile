# Dockerfile для Frontend (nginx) с поддержкой переменных окружения
FROM nginx:alpine

# Устанавливаем gettext для envsubst
RUN apk add --no-cache gettext

# Копируем статические файлы frontend
COPY *.html /usr/share/nginx/html/
COPY *.css /usr/share/nginx/html/
COPY *.js /usr/share/nginx/html/

# Копируем шаблоны конфигурации
COPY config.js.template /usr/share/nginx/html/
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

# Копируем startup script
COPY startup.sh /docker-entrypoint.d/30-frontend-config.sh
RUN chmod +x /docker-entrypoint.d/30-frontend-config.sh

# Устанавливаем переменные окружения по умолчанию
ENV PORT=8080
ENV API_BASE_URL="http://localhost:8000"
ENV APP_NAME="FamilyCoins"
ENV APP_VERSION="1.0.0"
ENV ENVIRONMENT="production"

# Expose default port (Railway переопределит через $PORT)
EXPOSE 8080

# Стандартный запуск nginx (startup script выполнится автоматически)
CMD ["nginx", "-g", "daemon off;"]
