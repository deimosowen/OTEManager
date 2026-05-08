#!/usr/bin/env bash
# Синхронизация актуального состояния GitHub (origin/main) в GitLab:
# один squash-коммит поверх gitlab/master → ветка sync/gitlab-mirror-github-main → push на remote gitlab.
#
# Нужно из-за корпоративного хука GitLab: история коммитов GitHub без тикетов не проходит pre-receive.
#
# Из корня репозитория (Git Bash или WSL):
#   SYNC_TICKET=CASEM-92589 ./scripts/sync-github-to-gitlab.sh
#   SYNC_TICKET=CASEM-92589 ./scripts/sync-github-to-gitlab.sh "релиз 0.2.1"
#
# Альтернатива первому аргументу без переменной:
#   ./scripts/sync-github-to-gitlab.sh CASEM-92589 "релиз 0.2.1"
#
# Переменные окружения:
#   SKIP_TESTS=1     — не вызывать npm test перед push
#   NO_PUSH=1        — только локально: squash + commit, без git push
#   ORIGIN_REMOTE    — имя remote GitHub (по умолчанию origin)
#   GITLAB_REMOTE    — имя remote GitLab (по умолчанию gitlab)

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "Запускайте из клона git-репозитория." >&2
  exit 1
}
cd "$ROOT"

ORIGIN_REMOTE="${ORIGIN_REMOTE:-origin}"
GITLAB_REMOTE="${GITLAB_REMOTE:-gitlab}"
TARGET_BRANCH="sync/gitlab-mirror-github-main"

TICKET="${SYNC_TICKET:-${1:-}}"
if [[ -n "${1:-}" ]] && [[ "$TICKET" == "$1" ]]; then
  shift || true
fi
DESC="${*:-mirror from GitHub main}"

if [[ -z "$TICKET" ]]; then
  echo "Укажите тикет под правила коммитов GitLab, например:" >&2
  echo "  SYNC_TICKET=CASEM-92589 ./scripts/sync-github-to-gitlab.sh [краткое описание]" >&2
  echo "  ./scripts/sync-github-to-gitlab.sh CASEM-92589 [краткое описание]" >&2
  exit 1
fi

for r in "$ORIGIN_REMOTE" "$GITLAB_REMOTE"; do
  if ! git remote get-url "$r" &>/dev/null; then
    echo "Не найден remote «$r». Добавьте: git remote add $r <url>" >&2
    exit 1
  fi
done

PREV_BRANCH="$(git branch --show-current 2>/dev/null || true)"

echo "→ fetch $ORIGIN_REMOTE, $GITLAB_REMOTE"
git fetch "$ORIGIN_REMOTE"
git fetch "$GITLAB_REMOTE"

echo "→ ветка $TARGET_BRANCH от $GITLAB_REMOTE/master"
git checkout -B "$TARGET_BRANCH" "$GITLAB_REMOTE/master"

echo "→ squash-merge $ORIGIN_REMOTE/main (несвязанные истории допускаются)"
set +e
git merge --squash "$ORIGIN_REMOTE/main" --allow-unrelated-histories
MERGE_STATUS=$?
set -e

if [[ "$MERGE_STATUS" -ne 0 ]]; then
  UNMERGED="$(git diff --name-only --diff-filter=U 2>/dev/null || true)"
  if [[ -n "$UNMERGED" ]]; then
    echo "→ разрешение конфликтов: оставляем версию файлов с GitHub (theirs)"
    git checkout --theirs -- .
    git add -A
  else
    echo "Ошибка merge (не конфликты слияния). Код: $MERGE_STATUS" >&2
    exit "$MERGE_STATUS"
  fi
fi

if git diff --cached --quiet; then
  echo "Нет изменений относительно целевой базы — push не нужен."
  if [[ -n "$PREV_BRANCH" ]]; then
    git checkout "$PREV_BRANCH"
  fi
  exit 0
fi

COMMIT_MSG="$TICKET Mirror GitHub main: OTE Manager — $DESC"
echo "→ commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

if [[ "${SKIP_TESTS:-}" != "1" ]]; then
  echo "→ npm test"
  npm test
else
  echo "→ SKIP_TESTS=1 — тесты пропущены"
fi

if [[ "${NO_PUSH:-}" != "1" ]]; then
  echo "→ push → $GITLAB_REMOTE/$TARGET_BRANCH"
  git push -u "$GITLAB_REMOTE" "$TARGET_BRANCH"
else
  echo "→ NO_PUSH=1 — выполните вручную: git push -u $GITLAB_REMOTE $TARGET_BRANCH"
fi

if [[ -n "$PREV_BRANCH" ]]; then
  git checkout "$PREV_BRANCH"
fi

echo "Готово. Создайте MR в master: https://gitlab.pravo.tech/caseone/ote.manager/-/merge_requests/new?merge_request%5Bsource_branch%5D=sync%2Fgitlab-mirror-github-main"
