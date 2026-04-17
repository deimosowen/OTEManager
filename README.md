# OTE Manager

Веб-интерфейс для управления тестовыми окружениями **OTE**. Стек: **Nuxt 3**, **Vue 3**, **JavaScript** (без TypeScript в исходниках), **Tailwind CSS**, **Pinia**.

## Требования

- **Node.js** 20+ (рекомендуется актуальный LTS, см. предупреждения `npm` при установке).

## Быстрый старт

```bash
git clone <url-репозитория>
cd OTEManager
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000). Экран входа использует **демо-авторизацию** (кнопка «Войти через Яндекс»); позже подключается реальный OAuth и API.

## Скрипты

| Команда | Назначение |
|--------|------------|
| `npm run dev` | Режим разработки |
| `npm run build` | Production-сборка |
| `npm run preview` | Просмотр собранного приложения |
| `npm run test` | Unit-тесты (Vitest) |
| `npm run test:watch` | Тесты в watch-режиме |
| `npm run test:coverage` | Тесты с отчётом покрытия (`coverage/`) |

## Структура репозитория

Корень — конфигурация и Git; **код приложения** — в каталоге **`src/`** (`srcDir` в Nuxt).

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
└── .env.example
```

Слои внутри `src/`:

- **`pages/`** — маршруты.
- **`layouts/`** — шаблоны страниц (`default`, `auth`).
- **`components/ui/`** — базовые UI-примитивы.
- **`components/domain/`** — логика списка OTE, фильтры, статусы.
- **`components/layout/`** — шапка, сайдбар, тосты.
- **`stores/`** — Pinia (`auth`, `environments`).
- **`constants/`**, **`mocks/`**, **`utils/`** — константы, моки, утилиты.

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

Скопируйте `.env.example` в `.env` и заполните значения, когда появится backend (сейчас файл-заглушка).

## Дальнейшее развитие

- Подключить реальный API вместо моков в `src/mocks/`.
- OAuth Яндекса вместо `loginWithYandexMock()` в `src/stores/auth.js`.
- При необходимости — e2e (Playwright) и компонентные тесты с `@vue/test-utils`.
