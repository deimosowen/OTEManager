# OTE Manager

Веб-интерфейс для управления тестовыми окружениями **OTE**. Стек: **Nuxt 3**, **Vue 3**, **JavaScript** (без TypeScript в исходниках), **Tailwind CSS**, **Pinia**.

## Требования

- **Node.js ≥ 22.15.0** — см. `engines` в `package.json` и файл `.nvmrc` (для `@yandex-cloud/nodejs-sdk` и актуального Nuxt).

## Быстрый старт

```bash
git clone https://github.com/deimosowen/OTEManager.git
cd OTEManager
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000). Вход — **OAuth Яндекса** (настройки в `.env`, см. ниже).

После входа доступны: список OTE из **Yandex Compute** (метки на ВМ), карточка окружения, **аудит**, **шаблоны деплоя** (YAML в БД), **создание OTE через TeamCity** (персональный токен в профиле; URL и build type id для группы — в админке «Система»).

## Скрипты


| Команда                  | Назначение                                          |
| ------------------------ | --------------------------------------------------- |
| `npm run dev`            | Режим разработки                                    |
| `npm run build`          | Production-сборка                                   |
| `npm run preview`        | Просмотр собранного приложения                      |
| `npm run test`           | Unit-тесты (Vitest)                                 |
| `npm run test:watch`     | Тесты в watch-режиме                                |
| `npm run test:coverage`  | Тесты с отчётом покрытия (`coverage/`)              |
| `npm run db:generate`    | Генерация миграций Drizzle (при изменении схемы)    |
| `npm run db:push`        | Применить схему к БД (dev)                          |
| `npm run db:studio`      | Drizzle Studio                                      |
| `npm run docker:publish` | Сборка и push образа (`DOCKER_IMAGE=…`, см. Docker) |


## База данных (SQLite)

По умолчанию файл БД: `data/ote.sqlite` (каталог `data/` в `.gitignore` для `*.sqlite`). Миграции лежат в `src/server/db/migrations/` и применяются при старте сервера (плагин `0-database`). Переменная `**NUXT_SQLITE_PATH`** — необязательный путь к файлу БД.

## Запуск в Docker

В корне репозитория: `**Dockerfile`**, `**docker-compose.yml`**, `**.dockerignore**`, пример переменных — `**.env.docker.example**`.

1. Скопируйте пример: `cp .env.docker.example .env.docker`.
2. Заполните минимум: `**NUXT_PUBLIC_SITE_URL**`, `**NUXT_PUBLIC_YANDEX_CLIENT_ID**`, `**NUXT_YANDEX_CLIENT_SECRET**`, `**NUXT_SESSION_SECRET**`. В кабинете Яндекс OAuth redirect URI должен быть `{NUXT_PUBLIC_SITE_URL}/api/auth/yandex/callback` (для локального Docker часто `http://localhost:3000/...`).
3. Сборка и старт: `docker compose up -d --build`.
4. Откройте [http://localhost:3000](http://localhost:3000) (или порт из переменной `**PORT**` в shell при вызове compose).

SQLite хранится в именованном томе `**sqlite_data**` (путь в контейнере `**/app/data**`, файл задаётся `**NUXT_SQLITE_PATH=/app/data/ote.sqlite**` в compose). Полный список переменных для YC / TeamCity — в `**.env.example**`: при необходимости добавьте те же ключи в `**.env.docker**`.

Образ: multi-stage сборка (`npm ci` → `npm run build` → `npm prune --omit=dev`), в финальном слое запуск `**node .output/server/index.mjs**`, слушает `**0.0.0.0:3000**`.

### Выкат без копирования репозитория на сервер (как готовый `redis:7-alpine`)

Идея: **на сервер попадает только образ из registry** плюс секреты (файл `.env.docker`), а не весь Git.

1. **Там, где есть исходники** (ваш ПК или CI), один раз собрать и запушить образ:
  ```bash
   DOCKER_IMAGE=ghcr.io/<ваш_логин>/ote-manager:0.1.5 npm run docker:publish
  ```
   Это выполнит `docker build -t … .` и `docker push …`. Залогиньтесь в registry заранее (`docker login ghcr.io` и т.п.).
2. **На сервере** — только pull и запуск. Минимум файлов: скопируйте `**.env.docker`** (из `**.env.docker.example`**) и при желании `**docker-compose.image.yml`**.
  Через Compose (без `build`, без клона репо):
   Или одной командой `**docker run**` (аналог вашего Redis): подставьте свой образ, порт и путь к env-файлу на хосте.
   Именованный том `**ote_manager_sqlite**` хранит SQLite между перезапусками (как `**-v chat_redis_data:/data**` у Redis). Секреты и OAuth URL — только в `**--env-file**`, репозиторий на сервер не нужен.

## Структура репозитория

Корень — конфигурация и Git; **код приложения** — в каталоге `**src/`** (`srcDir` в Nuxt).

```
.
├── src/                    # Исходники Nuxt-приложения
│   ├── app.vue
│   ├── assets/
│   ├── components/
│   ├── composables/
│   ├── constants/
│   ├── layouts/
│   ├── middleware/
│   ├── mocks/
│   ├── pages/
│   ├── server/             # Nitro: API, server middleware, utils (serverDir)
│   ├── stores/
│   └── utils/
├── tests/                  # Unit-тесты (Vitest)
│   └── unit/
├── public/                 # Статика (корень сайта)
├── nuxt.config.js
├── vitest.config.mjs
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── README.md
├── CONTRIBUTING.md
├── Dockerfile
├── docker-compose.yml
├── docker-compose.image.yml  # только image (без build) для сервера
├── .dockerignore
├── .env.example
└── .env.docker.example
```

Слои внутри `src/`:

- `**pages/**` — маршруты.
- `**layouts/**` — шаблоны страниц (`default`, `auth`).
- `**components/ui/**` — базовые UI-примитивы.
- `**components/domain/**` — логика списка OTE, фильтры, статусы.
- `**components/layout/**` — шапка, сайдбар, тосты.
- `**stores/**` — Pinia (`auth`, `environments`).
- `**constants/**`, `**mocks/**`, `**utils/**` — константы, моки, утилиты.
- `**server/**` — Nitro (только Node): `api/` (OAuth, YC, TeamCity, шаблоны, аудит), `db/`, `plugins/`, `utils/` (YC, TeamCity, аудит, очереди).

## Переменные: Yandex Cloud и TeamCity

Кратко (полный список — в `**.env.example**`):

- **YC**: каталог и облако задаются **по группе каталога** в админке («Настройки системы»); ключ сервисного аккаунта — `NUXT_YC_SA_KEY_PATH` или `NUXT_YC_SERVICE_ACCOUNT_JSON`; метки ВМ (`NUXT_YC_INSTANCE_LABEL_KEY` и др.).
- **TeamCity**: только персональный токен в профиле; хост REST/UI и build type id для start/stop/delete — в БД по группе (редактирование: **Админка → Система**).
- **«Мои окружения»** в списке: совпадение метки автора (`NUXT_YC_OTE_AUTHOR_LABEL`, по умолчанию `run-by`) с логином или почтой из сессии Яндекса.

## Git

Инициализация у себя (если клон не с пустого удалённого репозитория):

```bash
git init
git add .
git commit -m "chore: начальная структура проекта"
git branch -M main
git remote add origin <url>
git push -u origin main
```

Подробнее о ветках и PR — в [CONTRIBUTING.md](./CONTRIBUTING.md).

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните значения.

### Авторизация через Яндекс (OAuth)

1. Откройте [Яндекс OAuth](https://oauth.yandex.ru/) и создайте приложение.
2. В поле **Redirect URI** укажите ровно:
  `{NUXT_PUBLIC_SITE_URL}/api/auth/yandex/callback`  
   Например для локальной разработки: `http://localhost:3000/api/auth/yandex/callback`.
3. Включите права доступа к данным (минимум **Доступ к логину, имени и фамилии**, **Доступ к адресу электронной почты** — соответствует scope `login:info login:email` в коде).
4. В `.env` задайте:
  - `NUXT_PUBLIC_SITE_URL` — тот же базовый URL, что и в настройках приложения;
  - `NUXT_PUBLIC_YANDEX_CLIENT_ID` — ID приложения;
  - `NUXT_YANDEX_CLIENT_SECRET` — секрет;
  - `NUXT_SESSION_SECRET` — длинная случайная строка для подписи cookie-сессии.
5. Опционально `NUXT_ALLOWED_EMAIL_DOMAINS` — список разрешённых доменов email через запятую (как `ALLOWED_EMAIL_DOMAINS` в Mattermost_CaseOneBot).

Поток такой же, как в [Mattermost_CaseOneBot](https://github.com/deimosowen/Mattermost_CaseOneBot): редирект на Яндекс → callback → обмен `code` на токен → запрос `https://login.yandex.ru/info` → сессия в httpOnly-cookie.

## Ошибка `styleText` при `npm run dev`

Сообщение вида: *The requested module 'node:util' does not provide an export named 'styleText'* означает, что версия Node **ниже 20.12**. Обновите Node (например, с [nodejs.org](https://nodejs.org/) или через `nvm use` по файлу `.nvmrc`), затем снова `npm install` и `npm run dev`.

## Дальнейшее развитие

- Расширение сценариев TeamCity и интеграций по мере появления требований.
- При необходимости — e2e (Playwright) и компонентные тесты с `@vue/test-utils`.

### Серверные маршруты (Nitro)

Каталог `src/server/api/` — в том числе `auth/`, `me/`, `ote/` (список и карточка из YC, создание OTE, шаблоны, аудит).