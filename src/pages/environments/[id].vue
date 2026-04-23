<template>
  <Teleport to="body">
    <div
      v-if="deleteModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ote-delete-title"
      @click.self="deleteModalOpen = false"
    >
      <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="ote-delete-title" class="text-lg font-extrabold text-slate-900">Удалить OTE?</h2>
        <p class="mt-2 text-sm font-semibold text-slate-600">
          В TeamCity будет поставлена сборка удаления по тому же параметру metadata.tag, что и для старта/остановки.
          Дальнейшее выполнение — по сценарию в TeamCity; в интерфейсе появится ожидание до завершения сборки.
        </p>
        <p v-if="env" class="mt-2 truncate font-mono text-xs text-slate-500">{{ displayTitle }}</p>
        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <AppButton variant="secondary" :disabled="deleteBusy" @click="deleteModalOpen = false">Отмена</AppButton>
          <AppButton variant="danger" :loading="deleteBusy" @click="confirmDelete">Удалить</AppButton>
        </div>
      </div>
    </div>
  </Teleport>

  <div v-if="env">
    <div class="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h1 class="truncate text-[22px] font-extrabold text-slate-900">{{ displayTitle }}</h1>
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

        <div v-if="isYc && env.deleteDate" class="mt-2 text-sm font-semibold text-slate-600">
          Автоудаление: <span class="font-mono text-slate-800">{{ env.deleteDate }}</span>
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
          <AppButton variant="secondary" size="md" :disabled="!ycCanRefresh" @click="refreshOte">
            Обновить OTE
          </AppButton>
          <AppButton
            variant="danger"
            size="md"
            :disabled="env.status === OTE_STATUS.DELETING || Boolean(env.tcOperationPending)"
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
          <AppButton variant="danger" size="md" @click="removeSeed">
            <Trash2 class="size-3.5" />
            Удалить
          </AppButton>
        </template>
      </div>
    </div>

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

        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2">
          <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">Конфигурация для TeamCity</h2>
          <p class="mb-3 text-sm text-slate-600">Текст/JSON из metadata или меток (первый непустой по настройке каталога).</p>
          <pre
            v-if="tcConfigText"
            class="max-h-[420px] overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800"
            >{{ tcConfigText }}</pre
          >
          <div v-else class="text-sm font-semibold text-slate-500">Конфиг в метаданных не найден</div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-card lg:col-span-2">
          <h2 class="mb-4 text-[15px] font-extrabold text-slate-900">История развёртываний</h2>
          <div v-if="!deploymentRows.length" class="text-sm font-semibold text-slate-500">Записей нет</div>
          <ul v-else class="divide-y divide-slate-100 rounded-xl border border-slate-100">
            <li v-for="(d, i) in deploymentRows" :key="i" class="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span class="font-mono text-xs font-semibold text-slate-500">{{ d.at || '—' }}</span>
              <span class="font-mono text-xs text-slate-800"
                >бек {{ d.versionBackend || '—' }} / фронт {{ d.versionFrontend || '—' }}</span
              >
              <span v-if="d.note" class="w-full text-xs text-slate-600">{{ d.note }}</span>
            </li>
          </ul>
        </section>
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
              {{ formatDateRu(h.at) }}
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
      <p class="mb-3 text-xs font-semibold text-slate-500">
        UTC. Поиск по логину, почте и метке.
      </p>
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
              <th class="px-3 py-2.5">Время (UTC)</th>
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
                <td class="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-800">{{ formatOteAuditUtc(r.occurredAt) }}</td>
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
    <div class="text-sm font-semibold text-slate-600">Окружение не найдено</div>
    <div class="mt-4">
      <NuxtLink to="/" class="font-bold text-brand hover:underline">Вернуться к списку</NuxtLink>
    </div>
  </div>
</template>

<script setup>
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  Play,
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
import { formatDateRu } from '~/utils/date'

const route = useRoute()
const router = useRouter()
const store = useEnvironmentsStore()
const toast = useToast()
const rt = useRuntimeConfig()

const SHOW_YC_LABELS_ON_DETAIL = false

const deleteModalOpen = ref(false)
const deleteBusy = ref(false)
/** '' | 'start' | 'stop' — запрос к TeamCity с карточки */
const tcBusy = ref('')

const oteAuditRows = ref([])
const oteAuditLoading = ref(false)
const oteAuditError = ref('')
const oteAuditTotal = ref(0)
const oteAuditPage = ref(1)
const oteAuditFilterAction = ref('')
const oteAuditFilterDateFrom = ref('')
const oteAuditFilterDateTo = ref('')

const oteAuditTotalPages = computed(() => Math.max(1, Math.ceil(oteAuditTotal.value / AUDIT_LIST_PAGE_SIZE)))

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

const ycCanRefresh = computed(() => Boolean(isYc.value))

/** Те же правила, что в таблице списка (`OteMvpYcTable`). */
const cardCanStart = computed(() => {
  const e = env.value
  if (!e || e.source !== 'yc') return false
  if (e.tcOperationPending) return false
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
  if (e.status === OTE_STATUS.DELETING) return false
  const t = e.instances?.total
  const r = e.instances?.ready
  return typeof t === 'number' && t > 0 && typeof r === 'number' && r === t
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

const deploymentRows = computed(() => {
  const e = env.value
  if (!e || !Array.isArray(e.deploymentHistory)) return []
  return e.deploymentHistory
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
  () => Boolean(env.value?.tcOperationPending) && isYc.value,
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

async function loadDetail() {
  const id = apiId.value
  if (!id) return
  try {
    const { item } = await $fetch(`/api/ote/instances/${encodeURIComponent(id)}`, { credentials: 'include' })
    if (item) store.upsertItem(item)
  } catch {
    /* данные из списка / мок */
  }
  void loadOteAudit()
}

function formatOteAuditUtc(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' Z')
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

async function refreshOte() {
  if (!ycCanRefresh.value) return
  await loadDetail()
  toast.show('Сведения об OTE обновлены', 'success')
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
    toast.show(
      `Сборка удаления в TeamCity поставлена в очередь${buildId ? ` (#${buildId})` : ''}. Дождитесь завершения или обновите список.`,
      'success',
    )
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

function removeSeed() {
  const e = env.value
  if (!e) return
  if (!window.confirm(`Удалить OTE «${e.name}»?`)) return
  store.remove(e.id)
  toast.show(`OTE «${e.name}» удалена`, 'error')
  router.push('/')
}
</script>
