# Участие в разработке

## Ветки и коммиты

- Основная линия разработки: `main` (или согласованное имя с командой).
- Новая задача: ветка `feat/…`, `fix/…`, `chore/…`.
- Коммиты — коротко и по делу на русском или английском (как договоритесь в команде).

## Перед отправкой PR

На **Pull Request** в `main` / `master` автоматически запускается **GitHub Actions** (`.github/workflows/ci.yml`): `npm ci` → `npm run test` → `npm run build`. Убедитесь, что пайплайн зелёный.

Локально перед пушем:

```bash
npm install
npm run test
npm run build
```

### Настройки репозитория (рекомендуется)

В **Settings → Branches → Branch protection rules** для `main`: включить **Require status checks to pass** и отметить job **«Test & build»** из workflow CI.

## Структура

Исходники приложения лежат в **`src/`**. В корне репозитория — конфиги (`nuxt.config.js`, `vitest.config.mjs`, `tailwind.config.js`), `package.json`, `tests/` для тестов вне `src` (по желанию можно переносить в `src` — сейчас отдельно для явного разделения «приложение / тесты»).

## Код

- Без TypeScript в исходниках приложения (только JavaScript).
- Следуйте уже принятому стилю файлов и имён компонентов.
