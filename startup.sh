#!/bin/sh

# Устанавливаем переменные окружения по умолчанию
export PORT=${PORT:-8080}
export API_BASE_URL=${API_BASE_URL:-"http://localhost:8000"}
export APP_NAME=${APP_NAME:-"FamilyCoins"}
export APP_VERSION=${APP_VERSION:-"1.0.0"}
export ENVIRONMENT=${ENVIRONMENT:-"production"}

echo "Starting FamilyCoins Frontend..."
echo "Port: $PORT"
echo "API Base URL: $API_BASE_URL"
echo "Environment: $ENVIRONMENT"

# Создаем конфигурационный файл JavaScript из шаблона
envsubst '$API_BASE_URL,$APP_NAME,$APP_VERSION,$ENVIRONMENT' < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js

echo "Generated config.js:"
cat /usr/share/nginx/html/config.js

# Подставляем переменные в nginx конфигурацию
envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Generated nginx config:"
cat /etc/nginx/conf.d/default.conf

echo "Frontend is ready!"
