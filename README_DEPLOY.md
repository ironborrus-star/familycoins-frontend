# FamilyCoins Frontend

Frontend для семейного мотивационного приложения FamilyCoins.

## 🚀 Деплой в Railway

### Переменные окружения:

```env
API_BASE_URL=https://familycoins-production.up.railway.app
APP_NAME=FamilyCoins
APP_VERSION=1.0.0
ENVIRONMENT=production
```

### Локальный запуск:

```bash
# Собрать образ
docker build -t familycoins-frontend .

# Запустить с переменными
docker run -p 8080:8080 \
  -e API_BASE_URL=https://familycoins-production.up.railway.app \
  familycoins-frontend
```

## 📁 Структура проекта:

- `index.html` - главная страница
- `app.js` - JavaScript логика
- `styles.css` - стили
- `config.js.template` - шаблон конфигурации
- `nginx.conf.template` - шаблон nginx
- `startup.sh` - скрипт запуска
- `Dockerfile` - Docker конфигурация
- `railway.toml` - Railway конфигурация
