<template>
  <div class="mx-auto max-w-3xl pb-12">
    <!-- Hero -->
    <section
      class="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-brand via-brand-mid to-sky-500 px-6 py-10 text-white shadow-card-md sm:px-10 sm:py-12"
    >
      <div
        class="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-sky-300/20 blur-2xl"
        aria-hidden="true"
      />
      <div class="relative">
        <p class="text-sm font-semibold uppercase tracking-wider text-white/85">Внутренний инструмент</p>
        <h1 class="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">OTE Manager</h1>
        <p class="mt-3 max-w-xl text-base leading-relaxed text-white/95">
          Единая точка входа для команд, которые работают с тестовыми и демо-окружениями CaseOne в облаке Yandex:
          обзор ВМ, запуск сценариев в TeamCity и управление шаблонами сборок.
        </p>
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <span
            class="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-bold backdrop-blur-sm ring-1 ring-white/25"
          >
            <Package class="size-4 opacity-90" aria-hidden="true" />
            Версия {{ appVersion }}
          </span>
        </div>
      </div>
    </section>

    <!-- Что это -->
    <section class="mt-10">
      <h2 class="text-lg font-extrabold text-slate-900">Что это</h2>
      <p class="mt-3 text-[15px] leading-relaxed text-slate-600">
        <strong class="font-semibold text-slate-800">OTE Manager</strong> — веб-приложение для учёта и
        операций с окружениями OTE (one-time / ephemeral environments): список виртуальных машин в каталоге
        Yandex Cloud, ссылки на приложения и вспомогательные сервисы, агрегированное использование ресурсов и
        квот, интеграция с TeamCity для старта, остановки и удаления окружений по тегам.
      </p>
    </section>

    <!-- Зачем -->
    <section class="mt-10 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-card">
      <div class="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
        <h2 class="text-sm font-extrabold text-slate-800">Зачем это нужно</h2>
      </div>
      <ul class="divide-y divide-slate-100">
        <li class="flex gap-3 px-5 py-4">
          <span
            class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand"
          >
            <Eye class="size-[18px]" aria-hidden="true" />
          </span>
          <div>
            <p class="font-semibold text-slate-900">Прозрачность</p>
            <p class="mt-1 text-sm leading-relaxed text-slate-600">
              Быстро понять, какие окружения сейчас живут, кто их поднимал и какие версии на них развёрнуты.
            </p>
          </div>
        </li>
        <li class="flex gap-3 px-5 py-4">
          <span
            class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand"
          >
            <Zap class="size-[18px]" aria-hidden="true" />
          </span>
          <div>
            <p class="font-semibold text-slate-900">Скорость</p>
            <p class="mt-1 text-sm leading-relaxed text-slate-600">
              Запуск новой OTE по шаблону сборки: YAML и параметры согласованы с пайплайном TeamCity, без ручного
              копирования конфигов между системами.
            </p>
          </div>
        </li>
        <li class="flex gap-3 px-5 py-4">
          <span
            class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand"
          >
            <Shield class="size-[18px]" aria-hidden="true" />
          </span>
          <div>
            <p class="font-semibold text-slate-900">Контроль и история</p>
            <p class="mt-1 text-sm leading-relaxed text-slate-600">
              Аудит действий и сохранение параметров запуска помогают разбирать инциденты и воспроизводить
              сценарии.
            </p>
          </div>
        </li>
      </ul>
    </section>

    <!-- Возможности -->
    <section class="mt-10">
      <h2 class="text-lg font-extrabold text-slate-900">Основные возможности</h2>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div
          v-for="card in featureCards"
          :key="card.title"
          class="rounded-xl border border-slate-200/90 bg-white p-4 shadow-card transition hover:border-brand/25 hover:shadow-card-md"
        >
          <p class="font-semibold text-slate-900">{{ card.title }}</p>
          <p class="mt-1.5 text-sm leading-relaxed text-slate-600">{{ card.text }}</p>
        </div>
      </div>
    </section>

    <p class="mt-10 text-center text-xs text-slate-400">
      Версия {{ appVersion }} · сборка зафиксирована в образе или артефакте при деплое
    </p>
  </div>
</template>

<script setup>
import { Eye, Package, Shield, Zap } from 'lucide-vue-next'

const config = useRuntimeConfig()
const appVersion = computed(() => config.public.appVersion || '—')

const featureCards = [
  {
    title: 'Список окружений',
    text: 'Группировка по меткам, ссылки на SaaS или одиночный инстанс, RabbitMQ, сводка по CPU и памяти.',
  },
  {
    title: 'Шаблоны сборок',
    text: 'Хранение YAML с плейсхолдерами, параметры для TeamCity и предпросмотр перед запуском.',
  },
  {
    title: 'Создание OTE',
    text: 'Выбор шаблона, переопределение параметров и постановка сборки в TeamCity из интерфейса.',
  },
  {
    title: 'TeamCity',
    text: 'Старт, остановка и удаление окружений через согласованные конфигурации сборок.',
  },
]
</script>
