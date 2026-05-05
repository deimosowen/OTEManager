# OTE Manager

Веб-интерфейс для управления тестовыми окружениями **OTE**. **Nuxt 3**, **Vue 3**, **JavaScript**, **Tailwind**, **Pinia**, сервер — **Nitro** (SQLite + Drizzle).

## Требования

- **Node.js** версии из `.nvmrc` / поля `engines` в `package.json` (сейчас ≥ 22.15).

## Скрипты

| Команда | Назначение |
| --------| -----------|
| `npm run dev` | Режим разработки |
| `npm run build` | Production-сборка Nitro |
| `npm run preview` | Просмотр собранного приложения |
| `npm test` | Unit-тесты (Vitest) |
| `npm run test:integration` | Интеграционные тесты против `.output/server/index.mjs`; перед этим нужен `npm run build` |
| `npm run test:watch` | Тесты в watch |
| `npm run test:coverage` | Покрытие (`coverage/`) |
| `npm run db:generate` | Новые миграции Drizzle после правки схемы |
| `npm run db:push` | Применить схему к локальной БД (dev) |
| `npm run db:studio` | Drizzle Studio |
| `npm run docker:publish` | Сборка и push образа (`DOCKER_IMAGE=…`) |

## Переменные окружения

1. Скопируйте `cp .env.example .env.local` и заполните минимум для входа:
   - `NUXT_PUBLIC_SITE_URL` — базовый URL без `/` на конце (как в приложении Яндекс OAuth).
   - `NUXT_PUBLIC_YANDEX_CLIENT_ID`, `NUXT_YANDEX_CLIENT_SECRET`.
   - `NUXT_SESSION_SECRET` — длинная случайная строка для подписи cookie.
2. В кабинете [Яндекс OAuth](https://oauth.yandex.ru/) redirect URI:  
   `{NUXT_PUBLIC_SITE_URL}/api/auth/yandex/callback`  
   (локально: `http://localhost:3000/api/auth/yandex/callback`).
3. **Yandex Cloud**: ключ сервисного аккаунта и метки ВМ — переменные с префиксом `NUXT_YC_*` в `.env.example`; каталог по группе задаётся в админке.
4. **TeamCity**: в приложении используется только персональный токен из профиля; URL и build type id — по группе в админке.

Полный комментированный список — в `.env.example`. Для Docker см. `.env.docker.example`.

## База данных

Файл SQLite по умолчанию: `data/ote.sqlite`. Переопределение: `NUXT_SQLITE_PATH`. Миграции — `src/server/db/migrations/`, применяются при старте сервера.

## Тесты

- **Unit** — `tests/unit/`, конфиг `vitest.config.mjs`.
- **Интеграция** — `tests/integration/`, конфиг `vitest.integration.config.mjs`: поднимается процесс Nitro из `.output`, локальный HTTP-мок ответов TeamCity REST. В CI интеграция идёт после `npm run build`.

## Docker

В корне: `Dockerfile`, `docker-compose.yml`, `docker-compose.image.yml` (только pull образа), `.env.docker.example`.

```bash
cp .env.docker.example .env.docker
# заполните OAuth и секреты; затем:
docker compose up -d --build
```

SQLite в compose обычно в томе; путь к файлу задаётся переменными окружения (см. примеры env). Публикация образа в registry: `DOCKER_IMAGE=registry/ote-manager:tag npm run docker:publish`.

## Структура

```
├── src/                 # приложение Nuxt (pages, components, stores, …)
│   └── server/          # Nitro: api/, db/, plugins/, utils/
├── tests/
│   ├── unit/
│   └── integration/
├── public/
├── nuxt.config.js
├── vitest.config.mjs
├── vitest.integration.config.mjs
└── …
```

Ветки и PR — в [CONTRIBUTING.md](./CONTRIBUTING.md).