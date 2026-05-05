<template>
  <OteDeleteConfirmModal
    v-model="deleteModalOpen"
    :ote-label="displayTitle"
    variant="yc"
    :confirm-loading="deleteBusy"
    @confirm="confirmDelete"
  />
  <OteDeleteConfirmModal
    v-model="seedDeleteModalOpen"
    :ote-label="displayTitle"
    variant="seed"
    @confirm="confirmSeedDelete"
  />
  <OteProtectConfirmModal
    v-model="protectModalOpen"
    :mode="protectModalMode"
    :ote-label="displayTitle"
    :confirm-loading="protectBusy"
    @confirm="confirmProtectToggle"
  />

  <Teleport to="body">
    <div
      v-if="updateModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ote-update-modal-title"
    >
      <div class="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" aria-hidden="true" @click="closeUpdateOteModal" />
      <div
        class="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-slate-900/5"
        @click.stop
      >
        <div class="h-1 bg-gradient-to-r from-brand via-sky-500 to-sky-400" aria-hidden="true" />
        <div class="p-6 sm:p-7">
          <h2 id="ote-update-modal-title" class="text-lg font-extrabold tracking-tight text-slate-900">Обновить OTE</h2>
          <p class="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            Запускается та же сборка TeamCity, что при создании. Параметр
            <span class="font-mono text-slate-800">metadata.tag</span> берётся с текущей OTE — существующее окружение
            обновится по этой метке.
          </p>
          <label class="mt-5 block text-xs font-extrabold uppercase tracking-wide text-slate-500" for="ote-update-c1-version">
            caseone.version
          </label>
          <input
            id="ote-update-c1-version"
            v-model="updateVersionDraft"
            type="text"
            autocomplete="off"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            placeholder="например 3.2.1"
            @keydown.enter.prevent="submitOteUpdate"
          />
          <div class="mt-7 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
            <AppButton variant="secondary" :disabled="updateBusy" @click="closeUpdateOteModal">Отмена</AppButton>
            <AppButton variant="primary" :loading="updateBusy" :disabled="!updateVersionDraft.trim()" @click="submitOteUpdate">
              Запустить
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="modifyDeleteDateModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ote-modify-delete-date-title"
    >
      <div class="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" aria-hidden="true" @click="closeModifyDeleteDateModal" />
      <div
        class="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-slate-900/5"
        @click.stop
      >
        <div class="h-1 bg-gradient-to-r from-brand via-sky-500 to-sky-400" aria-hidden="true" />
        <div class="p-6 sm:p-7">
          <h2 id="ote-modify-delete-date-title" class="text-lg font-extrabold tracking-tight text-slate-900">Дата автоудаления</h2>
          <p class="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            Можно выбрать только завтра или позже. Дата на карточке обновится, когда изменение применится в облаке.
          </p>
          <p class="mt-5 text-xs font-extrabold uppercase tracking-wide text-slate-500">Новая дата удаления</p>
          <div class="mt-3">
            <AppDateCalendar v-model="modifyDeleteDateDraft" :min="modifyDeleteDateMin" />
          </div>
          <div class="mt-7 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5">
            <AppButton variant="secondary" :disabled="modifyDeleteBusy" @click="closeModifyDeleteDateModal">Отмена</AppButton>
            <AppButton variant="primary" :loading="modifyDeleteBusy" :disabled="!modifyDeleteDateDraft" @click="submitModifyDeleteDate">
              Запустить
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <section
    v-if="detailCardLoading && !env"
    class="rounded-2xl border border-slate-200 bg-white p-10 shadow-card"
    aria-busy="true"
    aria-label="Загрузка карточки окружения"
  >
    <div class="flex flex-col items-center justify-center gap-4 py-10">
      <Loader2 class="size-10 animate-spin text-brand" aria-hidden="true" />
      <p class="text-center text-sm font-semibold text-slate-600">Загружаем карточку OTE…</p>
    </div>
  </section>

  <div v-else-if="env">
    <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="flex min-w-0 flex-wrap items-center gap-2 text-[22px] font-extrabold text-slate-900">
          <span class="truncate">{{ displayTitle }}</span>
          <OteProtectedBadge v-if="isYc && env?.protected" />
        </h1>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
          <span class="inline-flex items-center gap-2">
            <span
              class="size-2 rounded-full"
              :class="
                env.status === 'running'
                  ? 'bg-emerald-500'
                  : env.status === 'deleting'
                    ? 'bg-amber-500'
                    : 'bg-slate-400'
              "
            />
            <span>{{ headlineStatus }}</span>
          </span>
          <template v-if="!isYc">
            <span class="text-slate-400">•</span>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
              @click="toast.show('Смена ветки/пресета: скоро', 'info')"
            >
              <Clock class="size-3" />
              {{ env.product }} / {{ env.type }}
              <ChevronDown class="size-3 opacity-70" />
            </button>
          </template>
        </div>

        <div
          v-if="isYc && env.tcOperationPending"
          class="mt-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-950"
        >
          <div class="flex items-start gap-2">
            <Loader2 class="mt-0.5 size-4 shrink-0 animate-spin text-amber-600" aria-hidden="true" />
            <span>{{ tcPendingDetailText }}</span>
          </div>
          <button
            type="button"
            class="self-start text-xs font-bold uppercase tracking-wide text-amber-900 underline decoration-amber-700/50 underline-offset-2 hover:decoration-amber-900"
            @click="clearTcLockFromCard"
          >
            Снять ожидание
          </button>
        </div>

        <div
          v-if="isYc && env.oteTcCreationBlocking"
          class="mt-3 flex flex-col gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-950"
        >
          <div class="flex items-start gap-2">
            <Loader2 class="mt-0.5 size-4 shrink-0 animate-spin text-sky-600" aria-hidden="true" />
            <span>{{ oteCreationBlockingCardText }}</span>
          </div>
          <NuxtLink
            :to="`/create/requests/${env.oteTcCreationBlocking.id}`"
            class="self-start text-xs font-bold text-brand underline decoration-brand/30 underline-offset-2"
          >
            Открыть запрос · логи TeamCity
          </NuxtLink>
        </div>

        <div v-if="isYc" class="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <div v-if="env.runBy" class="flex items-center gap-2 font-semibold text-slate-800">
            <UserRound class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
            <a
              v-if="profileHref(env.runBy)"
              :href="profileHref(env.runBy)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
            >
              {{ env.runBy }}
            </a>
            <span v-else>{{ env.runBy }}</span>
          </div>
          <span v-if="env.runBy" class="hidden text-slate-300 sm:inline">|</span>
          <div class="font-mono text-xs text-slate-700">
            <span class="font-bold text-slate-500">Бек:</span>
            {{ env.versionBackend || '—' }}
            <span class="mx-1.5 text-slate-300">/</span>
            <span class="font-bold text-slate-500">Фронт:</span>
            {{ env.versionFrontend || '—' }}
          </div>
          <span class="hidden text-slate-300 sm:inline">|</span>
          <div
            v-if="env.appLinks?.length"
            class="flex min-w-0 max-w-full flex-row flex-wrap items-center gap-x-2 gap-y-1"
          >
            <span class="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500">Приложения</span>
            <template v-for="(l, i) in env.appLinks" :key="l.key + l.href">
              <span v-if="i > 0" class="shrink-0 text-slate-300">/</span>
              <a
                :href="l.href"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-w-0 items-center gap-1 break-all font-bold text-brand hover:underline"
              >
                {{ l.label }}
                <ExternalLink class="size-3.5 shrink-0 opacity-70" />
              </a>
            </template>
          </div>
          <a
            v-else-if="env.appUrl"
            :href="env.appUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 font-bold text-brand hover:underline"
          >
            Приложение
            <ExternalLink class="size-3.5 shrink-0 opacity-70" />
          </a>
          <span v-else class="text-slate-400">Приложение: —</span>
        </div>

        <div v-if="isYc" class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-600">
          <span>Автоудаление:</span>
          <span class="font-mono text-slate-800">{{ env.deleteDate || '—' }}</span>
          <button
            type="button"
            class="text-xs font-bold text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            :disabled="!ycCanModifyDeleteDate"
            :title="ycModifyDeleteDateDisabledTitle"
            @click="openModifyDeleteDateModal"
          >
            Изменить
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-2.5">
        <template v-if="isYc">
          <AppButton
            v-if="cardCanStart"
            variant="primary"
            size="md"
            :loading="tcBusy === 'start'"
            @click="runTeamCity('start')"
          >
            <Play class="size-3.5" />
            Старт
          </AppButton>
          <AppButton
            v-if="cardCanStop"
            variant="warn"
            size="md"
            :loading="tcBusy === 'stop'"
            @click="runTeamCity('stop')"
          >
            <Square class="size-3.5" />
            Стоп
          </AppButton>
          <AppButton
            variant="secondary"
            size="md"
            :disabled="!ycCanSubmitOteUpdate"
            :title="ycOteUpdateDisabledTitle"
            @click="openUpdateOteModal"
          >
            Обновить OTE
          </AppButton>
          <AppButton
            v-if="cardCanToggleProtect"
            variant="secondary"
            size="md"
            :loading="protectBusy"
            :title="env.protected ? 'Снять защиту и восстановить дату автоудаления (+7 дней UTC)' : 'Защитить OTE (дата удаления 31.12.2099, удаление заблокировано)'"
            @click="openProtectModal(env.protected ? 'unprotect' : 'protect')"
          >
            <Shield v-if="!env.protected" class="size-3.5" />
            <ShieldOff v-else class="size-3.5" />
            {{ env.protected ? 'Снять защиту' : 'Защитить' }}
          </AppButton>
          <AppButton
            variant="danger"
            size="md"
            :disabled="
              env.status === OTE_STATUS.DELETING ||
              Boolean(env.tcOperationPending) ||
              Boolean(env.oteTcCreationBlocking) ||
              Boolean(env.protected)
            "
            :title="env.protected ? 'Снимите защиту, чтобы удалить OTE' : ''"
            @click="deleteModalOpen = true"
          >
            <Trash2 class="size-3.5" />
            Удалить
          </AppButton>
        </template>
        <template v-else>
          <AppButton v-if="env.status !== 'deleting'" variant="warn" size="md" @click="toggleSeed">
            <Square v-if="env.status === 'running'" class="size-3.5" />
            <Play v-else class="size-3.5" />
            {{ env.status === 'running' ? 'Остановить' : 'Запустить' }}
          </AppButton>
          <AppButton variant="danger" size="md" @click="seedDeleteModalOpen = true">
            <Trash2 class="size-3.5" />
            Удалить
          </AppButton>
        </template>
      </div>
    </div>

    <section
      v-if="isYc && oteTcCreationSummary"
      class="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
    >
      <h2 class="mb-3 text-[15px] font-extrabold text-slate-900">Создание OTE через TeamCity</h2>
      <p class="text-sm font-semibold text-slate-600">
        Запрос #{{ oteTcCreationSummary.id }} · статус:
        <span :class="oteTcCreationStatusClass(oteTcCreationSummary.status)">{{
          oteTcCreationStatusLabel(oteTcCreationSummary.status)
        }}</span>
      </p>
      <p v-if="oteTcCreationSummary.lastError" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
        {{ oteTcCreationSummary.lastError }}
      </p>
      <div v-if="oteTcCreationSummary.teamcityWebUrl" class="mt-4">
        <a
          :href="oteTcCreationSummary.teamcityWebUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
        >
          <ExternalLink class="size-4" aria-hidden="true" />
          Открыть сборку в TeamCity
        </a>
      </div>
      <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div v-if="oteTcCreationSummary.presetId">
          <dt class="font-bold text-slate-700">Пресет</dt>
          <dd class="mt-0.5 font-mono text-xs text-slate-600">{{ oteTcCreationSummary.presetId }}</dd>
        </div>
        <div v-if="oteTcCreationSummary.createdAt">
          <dt class="font-bold text-slate-700">Создан запрос</dt>
          <dd class="mt-0.5 font-mono text-xs text-slate-600">{{ formatDateTimeSeconds(oteTcCreationSummary.createdAt) }}</dd>
        </div>
        <div v-if="oteTcCreationSummary.actorLogin || oteTcCreationSummary.actorEmail">
          <dt class="font-bold text-slate-700">Инициатор</dt>
          <dd class="mt-0.5 text-xs text-slate-600">
            <span class="font-semibold">{{ oteTcCreationSummary.actorLogin || '—' }}</span>
            <span v-if="oteTcCreationSummary.actorEmail" class="mt-0.5 block truncate font-mono text-[11px] text-slate-500">{{
              oteTcCreationSummary.actorEmail
            }}</span>
          </dd>
        </div>
        <div v-if="oteTcCreationSummary.metadataTag">
          <dt class="font-bold text-slate-700">metadata.tag</dt>
          <dd class="mt-0.5 font-mono text-xs text-slate-600">{{ oteTcCreationSummary.metadataTag }}</dd>
        </div>
        <div v-if="oteTcCreationSummary.caseoneVersion">
          <dt class="font-bold text-slate-700">caseone.version</dt>
          <dd class="mt-0.5 font-mono text-xs text-slate-600">{{ oteTcCreationSummary.caseoneVersion }}</dd>
        </div>
      </dl>
      <dl v-if="oteTcCreationHasOutcomeLinks" class="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
        <div v-if="oteTcCreationSummary.caseoneUrl">
          <dt class="font-bold text-slate-700">CaseOne</dt>
          <dd class="mt-0.5">
            <a
              :href="oteTcCreationSummary.caseoneUrl"
              class="break-all font-semibold text-brand hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              >{{ oteTcCreationSummary.caseoneUrl }}</a
            >
          </dd>
        </div>
        <div v-if="oteTcCreationSummary.saasAppUrl">
          <dt class="font-bold text-slate-700">SaaS приложение</dt>
          <dd class="mt-0.5">
            <a
              :href="oteTcCreationSummary.saasAppUrl"
              class="break-all font-semibold text-brand hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              >{{ oteTcCreationSummary.saasAppUrl }}</a
            >
          </dd>
        </div>
        <div v-if="oteTcCreationSummary.rabbitUrl">
          <dt class="font-bold text-slate-700">RabbitMQ</dt>
          <dd class="mt-0.5 break-all font-mono text-xs text-slate-600">{{ oteTcCreationSummary.rabbitUrl }}</dd>
        </div>
      </dl>
      <details v-if="deploymentResultPretty" class="mt-4 border-t border-slate-100 pt-4">
        <summary class="cursor-pointer text-sm font-extrabold text-slate-800 [&::-webkit-details-marker]:hidden">
          deployment_result (JSON)
        </summary>
        <div class="mt-3">
          <AppCodeBlockWithLineNumbers :text="deploymentResultPretty" max-height-class="max-h-[320px]" />
        </div>
      </details>
    </section>

    <template v-if="isYc">
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section
          v-if="SHOW_YC_LABELS_ON_DETAIL && labelSections.length"
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2"
        >
          <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">Метки Yandex Cloud (labels)</h2>
          <div v-for="(sec, si) in labelSections" :key="sec.instanceId || String(si)" class="mb-6 last:mb-0">
            <div
              v-if="labelSections.length > 1"
              class="mb-2 flex flex-wrap items-baseline gap-2 border-b border-slate-100 pb-2"
            >
              <span class="text-sm font-extrabold text-slate-800">{{ sec.vmName || '—' }}</span>
              <span class="font-mono text-xs text-slate-500">{{ sec.instanceId }}</span>
            </div>
            <div v-if="!sec.entries.length" class="text-sm font-semibold text-slate-500">Меток нет</div>
            <div v-else class="overflow-x-auto rounded-xl border border-slate-100">
              <table class="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th class="px-3 py-2.5">Ключ</th>
                    <th class="px-3 py-2.5">Значение</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sec.entries" :key="row.key" class="border-b border-slate-50 last:border-b-0">
                    <td class="whitespace-nowrap px-3 py-2 align-top font-mono text-xs font-semibold text-brand">
                      {{ row.key }}
                    </td>
                    <td class="break-words px-3 py-2 align-top text-slate-800">{{ row.value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2">
          <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">Виртуальные машины</h2>
          <div v-if="!vmBuildRows.length" class="text-sm font-semibold text-slate-500">Нет данных по ВМ</div>
          <div v-else class="overflow-x-auto rounded-xl border border-slate-100">
            <table class="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th class="px-3 py-2.5">Имя</th>
                  <th class="px-3 py-2.5">ID</th>
                  <th class="px-3 py-2.5">Зона</th>
                  <th class="px-3 py-2.5">Платформа</th>
                  <th class="px-3 py-2.5">FQDN</th>
                  <th class="px-3 py-2.5">Статус YC</th>
                  <th class="px-3 py-2.5">vCPU</th>
                  <th class="px-3 py-2.5">RAM, ГБ</th>
                  <th class="px-3 py-2.5">Внутр. IP</th>
                  <th class="px-3 py-2.5">NAT</th>
                  <th class="px-3 py-2.5">Удаление</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, idx) in vmBuildRows" :key="r.instanceId || idx" class="border-b border-slate-50 last:border-b-0">
                  <td class="whitespace-nowrap px-3 py-2 font-semibold text-slate-900">{{ r.name }}</td>
                  <td class="px-3 py-2 font-mono text-xs text-slate-700">{{ r.instanceId }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ r.zoneId }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ r.platformId }}</td>
                  <td class="max-w-[200px] truncate px-3 py-2 font-mono text-xs" :title="r.fqdn">{{ r.fqdn || '—' }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ r.ycStatus }}</td>
                  <td class="px-3 py-2">{{ r.cores }}</td>
                  <td class="px-3 py-2">{{ r.memoryGb }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ r.ip || '—' }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ r.natIp || '—' }}</td>
                  <td class="px-3 py-2 font-mono text-xs">{{ r.deleteDate || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <details
          class="group rounded-2xl border border-slate-200 bg-white shadow-card lg:col-span-2 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary
            class="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-left transition hover:bg-slate-50/80"
          >
            <ChevronRight
              class="size-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-90"
              aria-hidden="true"
            />
            <h2 class="text-[15px] font-extrabold text-slate-900">Конфигурация для TeamCity</h2>
            <span v-if="tcConfigText" class="ml-auto text-xs font-semibold text-slate-400">{{ tcConfigLineCount }} строк</span>
          </summary>
          <div class="border-t border-slate-100 px-6 pb-6 pt-4">
            <p class="mb-3 text-sm text-slate-600">
              Текст или JSON из metadata или меток ВМ; если там пусто — подставляется сохранённый при создании OTE шаблон
              <span class="font-mono text-xs">default_deploymet_config_template</span> из базы (по метке OTE).
            </p>
            <AppCodeBlockWithLineNumbers v-if="tcConfigText" :text="tcConfigText" />
            <div v-else class="text-sm font-semibold text-slate-500">Конфиг не найден в метаданных и в сохранённых запросах TeamCity</div>
          </div>
        </details>
      </div>
    </template>

    <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section
        v-if="SHOW_YC_LABELS_ON_DETAIL && labelSections.length"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2"
      >
        <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">Метки Yandex Cloud (labels)</h2>
        <div v-for="(sec, si) in labelSections" :key="sec.instanceId || String(si)" class="mb-6 last:mb-0">
          <div
            v-if="labelSections.length > 1"
            class="mb-2 flex flex-wrap items-baseline gap-2 border-b border-slate-100 pb-2"
          >
            <span class="text-sm font-extrabold text-slate-800">{{ sec.vmName || '—' }}</span>
            <span class="font-mono text-xs text-slate-500">{{ sec.instanceId }}</span>
          </div>
          <div v-if="!sec.entries.length" class="text-sm font-semibold text-slate-500">Меток нет</div>
          <div v-else class="overflow-x-auto rounded-xl border border-slate-100">
            <table class="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th class="px-3 py-2.5">Ключ</th>
                  <th class="px-3 py-2.5">Значение</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in sec.entries" :key="row.key" class="border-b border-slate-50 last:border-b-0">
                  <td class="whitespace-nowrap px-3 py-2 align-top font-mono text-xs font-semibold text-brand">
                    {{ row.key }}
                  </td>
                  <td class="break-words px-3 py-2 align-top text-slate-800">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">Общая информация</h2>
        <div class="space-y-2.5">
          <div v-for="row in infoRows" :key="row.label" class="flex gap-2">
            <div class="min-w-[120px] text-sm font-semibold text-slate-500">{{ row.label }}:</div>
            <div class="text-sm font-extrabold text-slate-900">{{ row.value }}</div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">Инстансы</h2>
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="py-2 pr-3">Имя</th>
              <th class="py-2 pr-3">Статус</th>
              <th class="py-2 pr-3">Срез</th>
              <th class="py-2 pr-3">Идентификатор</th>
              <th class="py-2">Пересоздание</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="(env.instancesDetail || []).length === 0">
              <td colspan="5" class="py-8 text-sm font-semibold text-slate-500">Инстансы появятся после деплоя</td>
            </tr>
            <tr v-for="(ins, idx) in env.instancesDetail" :key="idx" class="border-b border-slate-200 last:border-b-0">
              <td class="py-3 pr-3 text-sm font-semibold">{{ ins.name }}</td>
              <td class="py-3 pr-3">
                <span
                  v-if="ins.statusTag === 'pending_delete'"
                  class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900"
                >
                  <span class="size-1.5 rounded-full bg-amber-500" />
                  К удалению
                </span>
                <span v-else-if="ins.ycStatus" class="font-mono text-xs font-semibold text-slate-700">{{ ins.ycStatus }}</span>
                <span v-else class="text-sm text-slate-600">—</span>
              </td>
              <td class="py-3 pr-3">
                <button type="button" class="text-sm font-bold text-brand hover:underline" @click.prevent>
                  {{ ins.disksLabel }}
                </button>
              </td>
              <td class="py-3 pr-3 font-mono text-xs text-slate-700">{{ ins.instanceId }}</td>
              <td class="py-3">
                <AppButton size="sm" class="!px-3.5 !py-1.5 !text-xs" @click="toast.show('Пересоздание: скоро', 'success')">
                  Создать
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">Последняя сборка</h2>
        <div v-if="env.lastBuild" class="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 class="size-[18px] shrink-0 text-emerald-600" />
          <div class="min-w-0 flex-1 text-sm font-semibold text-slate-900">
            <strong>{{ env.lastBuild.label }}</strong>
            <span class="text-slate-500"> • Build #{{ env.lastBuild.id }}</span>
          </div>
          <AppButton variant="secondary" size="sm" class="!text-xs" @click="toast.show('Ссылка на CI: скоро', 'info')">
            Открыть сборку
          </AppButton>
        </div>
        <div v-else class="text-sm font-semibold text-slate-500">Сборок пока нет</div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">История действий</h2>
        <div class="divide-y divide-slate-200">
          <div v-for="(h, idx) in env.history" :key="idx" class="flex gap-3 py-2">
            <div class="w-[92px] shrink-0 font-mono text-xs font-semibold text-slate-500">
              {{ formatDate(h.at) }}
            </div>
            <div class="text-sm font-semibold text-slate-800">{{ h.text }}</div>
          </div>
        </div>
      </section>
    </div>

    <section class="mt-5 mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-[15px] font-extrabold text-slate-900">Аудит по этой OTE</h2>
        <AppButton variant="secondary" size="sm" class="!text-xs" :loading="oteAuditLoading" @click="loadOteAudit">Обновить</AppButton>
      </div>
      <div class="mb-4 flex flex-wrap items-end gap-2">
        <div class="min-w-[140px] flex-1 sm:max-w-[200px]">
          <AppSelect v-model="oteAuditFilterAction" label="Действие" :options="AUDIT_ACTION_FILTER_OPTIONS" />
        </div>
        <div class="flex items-end gap-1.5">
          <div>
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">С</label>
            <input
              v-model="oteAuditFilterDateFrom"
              type="date"
              class="w-[128px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div>
            <label class="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">По</label>
            <input
              v-model="oteAuditFilterDateTo"
              type="date"
              class="w-[128px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </div>
        </div>
        <div class="min-w-0 w-full flex-[2] sm:w-auto sm:min-w-[200px]">
          <label class="mb-1 block text-sm font-bold text-slate-800">Поиск</label>
          <input
            v-model="searchDraft"
            type="search"
            autocomplete="off"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            placeholder="Логин, почта, метка…"
          />
        </div>
      </div>
      <p v-if="oteAuditError" class="mb-3 text-sm font-semibold text-rose-600">{{ oteAuditError }}</p>
      <div v-if="!oteAuditLoading && !oteAuditRows.length" class="text-sm font-semibold text-slate-500">
        Записей не найдено по текущим фильтрам или событий по этой OTE ещё не было.
      </div>
      <div v-else class="overflow-x-auto rounded-xl border border-slate-100">
        <table class="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th class="px-3 py-2.5">Время</th>
              <th class="px-3 py-2.5">Действие</th>
              <th class="px-3 py-2.5">Логин</th>
              <th class="px-3 py-2.5">Почта</th>
              <th class="px-3 py-2.5">Метка OTE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="oteAuditLoading">
              <td colspan="5" class="px-3 py-6 text-center text-sm font-semibold text-slate-500">Загрузка…</td>
            </tr>
            <template v-else>
              <tr v-for="r in oteAuditRows" :key="r.id" class="border-b border-slate-50 last:border-b-0">
                <td class="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-800">{{ formatDateTimeSeconds(r.occurredAt) }}</td>
                <td class="px-3 py-2 font-semibold text-slate-900">{{ auditActionLabel(r.actionCode) }}</td>
                <td class="px-3 py-2 text-slate-700">{{ r.actorLogin || '—' }}</td>
                <td class="max-w-[180px] truncate px-3 py-2 text-xs text-slate-700" :title="r.actorEmail">{{ r.actorEmail || '—' }}</td>
                <td class="max-w-[160px] truncate px-3 py-2 font-mono text-xs text-slate-600" :title="r.oteTag || ''">
                  {{ r.oteTag || '—' }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div
        v-if="oteAuditTotal > 0"
        class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600"
      >
        <span>Всего записей: {{ oteAuditTotal }} · страница {{ oteAuditPage }} из {{ oteAuditTotalPages }}</span>
        <div class="flex flex-wrap gap-2">
          <AppButton variant="secondary" size="sm" class="!text-xs" :disabled="oteAuditPage <= 1 || oteAuditLoading" @click="goOteAuditPage(oteAuditPage - 1)">
            Назад
          </AppButton>
          <AppButton
            variant="secondary"
            size="sm"
            class="!text-xs"
            :disabled="oteAuditPage >= oteAuditTotalPages || oteAuditLoading"
            @click="goOteAuditPage(oteAuditPage + 1)"
          >
            Вперёд
          </AppButton>
        </div>
      </div>
    </section>
  </div>

  <div v-else class="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-card">
    <div class="text-sm font-semibold text-slate-600">Окружение не найдено или нет доступа</div>
    <div class="mt-4">
      <NuxtLink to="/environments" class="font-bold text-brand hover:underline">Вернуться к списку</NuxtLink>
    </div>
  </div>
</template>

<script setup>
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  Shield,
  ShieldOff,
  Square,
  Trash2,
  UserRound,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuditListSearch } from '~/composables/useAuditListSearch'
import { notifyOteInstancesRefresh } from '~/composables/useOteInstancesBroadcast'
import { AUDIT_ACTION_FILTER_OPTIONS, AUDIT_LIST_PAGE_SIZE, AUDIT_SEARCH_DEBOUNCE_MS, auditActionLabel } from '~/constants/audit'
import { $fetch } from 'ofetch'
import { useEnvironmentsStore } from '~/stores/environments'
import { OTE_STATUS, OTE_STATUS_LABELS } from '~/constants/ote'
import { useUserTimeFormat } from '~/composables/useUserTimeFormat'

const { formatDate, formatDateTimeSeconds, timeZone } = useUserTimeFormat()
import { oteTcCreationStatusClass, oteTcCreationStatusLabel } from '~/utils/ote-tc-creation-status.js'

const route = useRoute()
const router = useRouter()
const store = useEnvironmentsStore()
const toast = useToast()
const rt = useRuntimeConfig()

const SHOW_YC_LABELS_ON_DETAIL = false

const deleteModalOpen = ref(false)
const seedDeleteModalOpen = ref(false)
const deleteBusy = ref(false)
/** '' | 'start' | 'stop' — запрос к TeamCity с карточки */
const tcBusy = ref('')

const updateModalOpen = ref(false)
const updateVersionDraft = ref('')
const updateBusy = ref(false)

const modifyDeleteDateModalOpen = ref(false)
const modifyDeleteDateDraft = ref('')
const modifyDeleteBusy = ref(false)

/** Первый запрос карточки по API ещё идёт (в store может не быть строки даже для существующей OTE). */
const detailCardLoading = ref(true)

const protectModalOpen = ref(false)
/** @type {import('vue').Ref<'protect'|'unprotect'>} */
const protectModalMode = ref('protect')
const protectBusy = ref(false)

function localIsoDatePlusDays(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + Number(days) || 0)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

const modifyDeleteDateMin = computed(() => localIsoDatePlusDays(1))

function openModifyDeleteDateModal() {
  modifyDeleteDateDraft.value = modifyDeleteDateMin.value
  modifyDeleteDateModalOpen.value = true
}

function closeModifyDeleteDateModal() {
  if (modifyDeleteBusy.value) return
  modifyDeleteDateModalOpen.value = false
}

function openProtectModal(mode) {
  protectModalMode.value = mode
  protectModalOpen.value = true
}

async function confirmProtectToggle() {
  const id = apiId.value
  const e = env.value
  if (!id || !e || protectBusy.value) return
  const wantProtect = protectModalMode.value === 'protect'
  protectBusy.value = true
  try {
    await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/protected`, {
      method: 'POST',
      body: { confirm: true, protected: wantProtect },
      credentials: 'include',
    })
    toast.show(wantProtect ? 'OTE защищена: дата удаления отправлена в TeamCity.' : 'Защита снята: дата удаления отправлена в TeamCity (+7 дней UTC).', 'success')
    protectModalOpen.value = false
    await loadDetail()
    try {
      await store.refreshFromYandexApi()
    } catch {
      /* ignore */
    }
    notifyOteInstancesRefresh()
  } catch (err) {
    const sc = err?.statusCode ?? err?.response?.status
    const msg = err?.data?.message || err?.message || String(err)
    toast.show(msg, sc === 409 || sc === 403 ? 'warn' : 'error')
  } finally {
    protectBusy.value = false
  }
}

async function submitModifyDeleteDate() {
  const id = apiId.value
  const dateStr = String(modifyDeleteDateDraft.value || '').trim()
  if (!id || !dateStr || modifyDeleteBusy.value) return
  modifyDeleteBusy.value = true
  try {
    const res = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/teamcity`, {
      method: 'POST',
      body: { action: 'modify_delete_date', deleteDate: dateStr },
      credentials: 'include',
    })
    const buildId = res?.teamCity?.buildId
    toast.show(`Сборка изменения даты удаления в TeamCity поставлена в очередь${buildId ? ` (#${buildId})` : ''}.`, 'success')
    modifyDeleteDateModalOpen.value = false
    await loadDetail()
    try {
      await store.refreshFromYandexApi()
    } catch {
      /* ignore */
    }
    notifyOteInstancesRefresh()
  } catch (err) {
    const sc = err?.statusCode ?? err?.response?.status
    toast.show(err?.data?.message || err?.message || String(err), sc === 409 ? 'warn' : 'error')
  } finally {
    modifyDeleteBusy.value = false
  }
}

const OTE_UPDATE_PRESET = 'build-template-update'

const oteAuditRows = ref([])
const oteAuditLoading = ref(false)
const oteAuditError = ref('')
const oteAuditTotal = ref(0)
const oteAuditPage = ref(1)
const oteAuditFilterAction = ref('')
const oteAuditFilterDateFrom = ref('')
const oteAuditFilterDateTo = ref('')

const oteAuditTotalPages = computed(() => Math.max(1, Math.ceil(oteAuditTotal.value / AUDIT_LIST_PAGE_SIZE)))

/** metadata.tag (карточка `oteName`) — для аудита вместе с id карточки (события создания идут с `ote_tag`). */
const oteAuditTagQueryParam = computed(() => {
  const e = env.value
  if (!e || e.source !== 'yc') return ''
  const t = e.oteName
  return typeof t === 'string' && t.trim() ? t.trim() : ''
})

const oteAuditDebounceSec = computed(() => Math.round(AUDIT_SEARCH_DEBOUNCE_MS / 1000))

const { searchDraft, searchQuery, resetSearch } = useAuditListSearch(() => {
  oteAuditPage.value = 1
  void loadOteAudit()
})

const apiId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : Array.isArray(id) ? id[0] : ''
})

const env = computed(() => store.byId(apiId.value))

const isYc = computed(() => env.value?.source === 'yc')

const displayTitle = computed(() => {
  const e = env.value
  if (!e) return 'OTE'
  if (e.source === 'yc' && e.oteName) return String(e.oteName)
  return e.name || 'OTE'
})

const headlineStatus = computed(() => {
  const e = env.value
  if (!e) return '—'
  if (e.source === 'yc') {
    if (e.status === OTE_STATUS.DELETING) return 'Удаляется'
    if (e.status === OTE_STATUS.RUNNING) return 'Работает'
    return 'Спит'
  }
  return OTE_STATUS_LABELS[e.status] || '—'
})

/** Все ВМ OTE в YC в состоянии «работает» (иначе обновление по тегу недоступно). */
const allYcInstancesRunning = computed(() => {
  const e = env.value
  if (!e || e.source !== 'yc') return false
  const t = e.instances?.total
  const r = e.instances?.ready
  if (typeof t !== 'number' || t < 1) return false
  if (typeof r !== 'number' || r !== t) return false
  return e.status === OTE_STATUS.RUNNING
})

const ycCanSubmitOteUpdate = computed(() => {
  const e = env.value
  if (!e || e.source !== 'yc') return false
  if (e.status === OTE_STATUS.DELETING) return false
  if (e.tcOperationPending) return false
  if (e.oteTcCreationBlocking) return false
  if (!e.oteTcUpdateViaManagerAvailable) return false
  return allYcInstancesRunning.value
})

const ycOteUpdateDisabledTitle = computed(() => {
  if (!isYc.value) return ''
  const e = env.value
  if (!e) return ''
  if (e.status === OTE_STATUS.DELETING) return 'Окружение удаляется'
  if (e.tcOperationPending) return 'Дождитесь завершения операции TeamCity'
  if (e.oteTcCreationBlocking) return 'Уже идёт сборка по этой метке'
  if (!allYcInstancesRunning.value) return 'Нужны все ВМ в состоянии «работает» (запустите остановленные)'
  if (!e.oteTcUpdateViaManagerAvailable) {
    return 'Обновление через менеджер возможно только если эта OTE уже успешно создавалась здесь по тому же metadata.tag — тогда известен шаблон TeamCity. Иначе используйте API с полем buildTemplateId.'
  }
  return ''
})

const ycCanModifyDeleteDate = computed(() => {
  const e = env.value
  if (!e || e.source !== 'yc') return false
  if (e.status === OTE_STATUS.DELETING) return false
  if (e.tcOperationPending) return false
  if (e.oteTcCreationBlocking) return false
  if (e.protected) return false
  return true
})

const ycModifyDeleteDateDisabledTitle = computed(() => {
  const e = env.value
  if (!e) return ''
  if (e.status === OTE_STATUS.DELETING) return 'Окружение удаляется'
  if (e.tcOperationPending) return 'Дождитесь завершения операции TeamCity'
  if (e.oteTcCreationBlocking) return 'Уже идёт сборка по этой метке'
  if (e.protected) return 'Для защищённой OTE дата удаления задаётся через действие «Защитить» / «Снять защиту»'
  return ''
})

/** Те же правила, что в таблице списка (`OteMvpYcTable`). */
const oteCreationBlockingCardText = computed(() => {
  const b = env.value?.oteTcCreationBlocking
  if (!b?.id) return ''
  const upd = String(b?.presetId || '') === OTE_UPDATE_PRESET
  const kind = upd ? 'обновление' : 'создание'
  return `Для этой метки выполняется ${kind} OTE (запрос #${b.id}). Старт, стоп, удаление, изменение даты удаления и повторное обновление недоступны, пока сборка в TeamCity не завершится успешно или с ошибкой.`
})

const cardCanStart = computed(() => {
  const e = env.value
  if (!e || e.source !== 'yc') return false
  if (e.tcOperationPending) return false
  if (e.oteTcCreationBlocking) return false
  if (e.status === OTE_STATUS.DELETING) return false
  const t = e.instances?.total
  const r = e.instances?.ready
  if (typeof t !== 'number' || t < 1) return false
  return typeof r === 'number' && r < t
})

const cardCanStop = computed(() => {
  const e = env.value
  if (!e || e.source !== 'yc') return false
  if (e.tcOperationPending) return false
  if (e.oteTcCreationBlocking) return false
  if (e.status === OTE_STATUS.DELETING) return false
  const t = e.instances?.total
  const r = e.instances?.ready
  return typeof t === 'number' && t > 0 && typeof r === 'number' && r === t
})

const cardCanToggleProtect = computed(() => {
  const e = env.value
  if (!e || e.source !== 'yc') return false
  if (e.status === OTE_STATUS.DELETING) return false
  if (e.tcOperationPending) return false
  if (e.oteTcCreationBlocking) return false
  return true
})

const tcPendingDetailText = computed(() => {
  const p = env.value?.tcOperationPending
  if (!p) return ''
  const r = p.progress?.running ?? 0
  const t = p.progress?.total ?? 0
  if (p.action === 'start') {
    return `Идёт запуск через TeamCity: работают ${r} из ${t} ВМ. Блокировка снимется после завершения сборки в TeamCity; при зависании можно снять ожидание вручную.`
  }
  if (p.action === 'delete') {
    return `Идёт удаление через TeamCity: в каталоге ещё видно ${r} из ${t} ВМ. Блокировка снимется после завершения сборки в TeamCity; при зависании можно снять ожидание вручную.`
  }
  if (p.action === 'modify_delete_date') {
    return `Идёт изменение даты автоудаления через TeamCity. Блокировка снимется после завершения сборки в TeamCity; при зависании можно снять ожидание вручную.`
  }
  return `Идёт остановка через TeamCity: работают ${r} из ${t} ВМ. Блокировка снимется после завершения сборки в TeamCity; при зависании можно снять ожидание вручную.`
})

const vmBuildRows = computed(() => {
  const e = env.value
  if (!e || !Array.isArray(e.vmBuildLogRows)) return []
  return e.vmBuildLogRows
})

const tcConfigText = computed(() => {
  const t = env.value?.tcConfigText
  return typeof t === 'string' ? t : ''
})

const tcConfigLineCount = computed(() => {
  const s = tcConfigText.value
  if (!s) return 0
  return s.split('\n').length
})

const oteTcCreationSummary = computed(() => {
  const o = env.value?.oteTcCreationSummary
  return o && typeof o === 'object' ? o : null
})

const deploymentResultPretty = computed(() => {
  const raw = oteTcCreationSummary.value?.deploymentResultJson
  if (raw == null || typeof raw !== 'string' || !raw.trim()) return ''
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
})

const oteTcCreationHasOutcomeLinks = computed(() => {
  const s = oteTcCreationSummary.value
  if (!s) return false
  return Boolean(s.caseoneUrl || s.saasAppUrl || s.rabbitUrl)
})

const labelSections = computed(() => {
  const e = env.value
  if (!e || !Array.isArray(e.ycLabelSections)) return []
  return e.ycLabelSections
})

useHead(() => ({
  title: env.value ? `${displayTitle.value} · OTE Manager` : 'OTE Manager',
}))

let detailPollTimer = null

function clearDetailPoll() {
  if (detailPollTimer != null) {
    clearInterval(detailPollTimer)
    detailPollTimer = null
  }
}

watch(
  () =>
    Boolean(env.value?.tcOperationPending || env.value?.oteTcCreationBlocking) && isYc.value,
  (active) => {
    clearDetailPoll()
    if (!active) return
    detailPollTimer = setInterval(() => {
      void loadDetail()
    }, 12000)
  },
  { immediate: true },
)

watch(apiId, (id) => {
  if (id) {
    resetSearch()
    oteAuditPage.value = 1
    oteAuditFilterAction.value = ''
    oteAuditFilterDateFrom.value = ''
    oteAuditFilterDateTo.value = ''
    detailCardLoading.value = true
    void loadDetail()
  }
})

watch([oteAuditFilterAction, oteAuditFilterDateFrom, oteAuditFilterDateTo], () => {
  oteAuditPage.value = 1
  if (apiId.value) void loadOteAudit()
})

onMounted(() => {
  void loadDetail()
})

onUnmounted(() => {
  clearDetailPoll()
})

let loadDetailSeq = 0

async function loadDetail() {
  const id = apiId.value
  if (!id) {
    detailCardLoading.value = false
    return
  }
  const seq = ++loadDetailSeq
  detailCardLoading.value = true
  try {
    const { item } = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}`, { credentials: 'include' })
    if (seq !== loadDetailSeq) return
    if (item) store.upsertItem(item)
  } catch {
    /* данные из списка / мок; ошибка доступа см. финальную плашку «не найдено» */
  } finally {
    if (seq === loadDetailSeq) detailCardLoading.value = false
  }
  if (seq === loadDetailSeq) void loadOteAudit()
}

async function loadOteAudit() {
  const id = apiId.value
  if (!id) return
  oteAuditLoading.value = true
  oteAuditError.value = ''
  try {
    const res = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/audit`, {
      credentials: 'include',
      query: {
        page: String(oteAuditPage.value),
        ...(oteAuditFilterAction.value ? { actionCode: oteAuditFilterAction.value } : {}),
        ...(searchQuery.value ? { search: searchQuery.value } : {}),
        ...(oteAuditFilterDateFrom.value ? { dateFrom: oteAuditFilterDateFrom.value } : {}),
        ...(oteAuditFilterDateTo.value ? { dateTo: oteAuditFilterDateTo.value } : {}),
        ...(oteAuditTagQueryParam.value ? { oteTag: oteAuditTagQueryParam.value } : {}),
      },
    })
    oteAuditRows.value = Array.isArray(res?.items) ? res.items : []
    oteAuditTotal.value = typeof res?.total === 'number' ? res.total : Number(res?.total) || 0
    if (typeof res?.page === 'number' && res.page >= 1) oteAuditPage.value = res.page
  } catch (e) {
    oteAuditError.value = e?.data?.message || e?.message || String(e)
    oteAuditRows.value = []
    oteAuditTotal.value = 0
  } finally {
    oteAuditLoading.value = false
  }
}

function goOteAuditPage(p) {
  const next = Math.min(Math.max(1, p), oteAuditTotalPages.value)
  oteAuditPage.value = next
  void loadOteAudit()
}

function profileHref(login) {
  const t = rt.public.profileExternalUrlTemplate
  if (!t || !login) return ''
  return String(t)
    .replace(/\{user\}/g, encodeURIComponent(login))
    .replace(/\{login\}/g, encodeURIComponent(login))
}

const infoRows = computed(() => {
  const e = env.value
  if (!e) return []
  const base = [
    { label: 'Имя', value: e.name },
    { label: 'Тип', value: e.type },
    { label: 'Продукт', value: e.product },
    { label: 'Версия CaseOne', value: e.caseOneVersion || '—' },
  ]
  if (Array.isArray(e.cloudSummary) && e.cloudSummary.length) {
    return [...base, ...e.cloudSummary.map((r) => ({ label: r.label, value: String(r.value ?? '—') }))]
  }
  return base
})

async function runTeamCity(action) {
  const id = apiId.value
  if (!id || tcBusy.value) return
  tcBusy.value = action
  try {
    const res = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/teamcity`, {
      method: 'POST',
      body: { action },
      credentials: 'include',
    })
    const buildId = res?.teamCity?.buildId
    toast.show(`Сборка TeamCity поставлена в очередь${buildId ? ` (#${buildId})` : ''}.`, 'success')
    await loadDetail()
    try {
      await store.refreshFromYandexApi()
    } catch {
      /* список на главной обновится позже */
    }
    notifyOteInstancesRefresh()
  } catch (err) {
    const sc = err?.statusCode ?? err?.response?.status
    const msg = err?.data?.message || err?.message || String(err)
    toast.show(msg, sc === 409 ? 'warn' : 'error')
  } finally {
    tcBusy.value = ''
  }
}

function openUpdateOteModal() {
  if (!ycCanSubmitOteUpdate.value) return
  const e = env.value
  updateVersionDraft.value = String(e?.caseOneVersion || '').trim() || ''
  updateModalOpen.value = true
}

function closeUpdateOteModal() {
  if (updateBusy.value) return
  updateModalOpen.value = false
}

async function submitOteUpdate() {
  const id = apiId.value
  const v = updateVersionDraft.value.trim()
  if (!id || !v || updateBusy.value) return
  updateBusy.value = true
  try {
    await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/update`, {
      method: 'POST',
      body: { caseoneVersion: v },
      credentials: 'include',
    })
    toast.show('Сборка обновления поставлена в TeamCity.', 'success')
    updateModalOpen.value = false
    await loadDetail()
    try {
      await store.refreshFromYandexApi()
    } catch {
      /* ignore */
    }
    notifyOteInstancesRefresh()
  } catch (err) {
    const sc = err?.statusCode ?? err?.response?.status
    toast.show(err?.data?.message || err?.message || String(err), sc === 409 ? 'warn' : 'error')
  } finally {
    updateBusy.value = false
  }
}

async function clearTcLockFromCard() {
  const id = apiId.value
  if (!id) return
  try {
    await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/tc-pending-clear`, {
      method: 'POST',
      credentials: 'include',
    })
    toast.show('Ожидание TeamCity снято', 'success')
    await loadDetail()
    try {
      await store.refreshFromYandexApi()
    } catch {
      /* ignore */
    }
    notifyOteInstancesRefresh()
  } catch (err) {
    toast.show(err?.data?.message || err?.message || String(err), 'error')
  }
}

async function confirmDelete() {
  const id = apiId.value
  const e = env.value
  if (!id || !e || deleteBusy.value) return
  deleteBusy.value = true
  try {
    const res = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}/teamcity`, {
      method: 'POST',
      body: { action: 'delete' },
      credentials: 'include',
    })
    const buildId = res?.teamCity?.buildId
    deleteModalOpen.value = false
    toast.show(`Сборка удаления в TeamCity поставлена в очередь${buildId ? ` (#${buildId})` : ''}.`, 'success')
    await loadDetail()
    try {
      await store.refreshFromYandexApi()
    } catch {
      /* ignore */
    }
    notifyOteInstancesRefresh()
  } catch (err) {
    const sc = err?.statusCode ?? err?.response?.status
    const msg = err?.data?.message || err?.message || String(err)
    toast.show(msg, sc === 409 ? 'warn' : 'error')
  } finally {
    deleteBusy.value = false
  }
}

function toggleSeed() {
  const e = env.value
  if (!e || e.status === OTE_STATUS.DELETING) return
  const running = e.status === OTE_STATUS.RUNNING
  store.setRunning(e.id, !running)
  toast.show(running ? 'Окружение остановлено' : 'Окружение запущено', 'success')
}

function confirmSeedDelete() {
  const e = env.value
  if (!e) {
    seedDeleteModalOpen.value = false
    return
  }
  store.remove(e.id)
  toast.show(`OTE «${e.name}» удалена`, 'error')
  seedDeleteModalOpen.value = false
  router.push('/')
}
</script>
