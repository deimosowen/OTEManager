# OTE Manager

Веб-интерфейс для управления тестовыми окружениями **OTE**. Стек: **Nuxt 3**, **Vue 3**, **JavaScript** (без TypeScript в исходниках), **Tailwind CSS**, **Pinia**.

## Требования

- **Node.js ≥ 20.12.0** — иначе Nuxt CLI падает с ошибкой `does not provide an export named 'styleText'` (API `util.styleText` появился в Node 20.12).
- Рекомендуется **Node 20.19+** (см. `.nvmrc` и предупреждения `npm` про `EBADENGINE`).

## Быстрый старт

```bash
git clone <url-репозитория>
cd OTEManager
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000). Экран входа использует **демо-авторизацию** (кнопка «Войти через Яндекс»); позже подключается реальный OAuth и API.

## Скрипты


| Команда                 | Назначение                             |
| ----------------------- | -------------------------------------- |
| `npm run dev`           | Режим разработки                       |
| `npm run build`         | Production-сборка                      |
| `npm run preview`       | Просмотр собранного приложения         |
| `npm run test`          | Unit-тесты (Vitest)                    |
| `npm run test:watch`    | Тесты в watch-режиме                   |
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

## Ошибка `styleText` при `npm run dev`

Сообщение вида: *The requested module 'node:util' does not provide an export named 'styleText'* означает, что версия Node **ниже 20.12**. Обновите Node (например, с [nodejs.org](https://nodejs.org/) или через `nvm use` по файлу `.nvmrc`), затем снова `npm install` и `npm run dev`.

## Дальнейшее развитие

- Подключить реальный API вместо моков в `src/mocks/`.
- OAuth Яндекса вместо `loginWithYandexMock()` в `src/stores/auth.js`.
- При необходимости — e2e (Playwright) и компонентные тесты с `@vue/test-utils`.

