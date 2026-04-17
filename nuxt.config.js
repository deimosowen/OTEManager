// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  /** Исходники приложения — в `src/` (корень репозитория для конфигов и Git) */
  srcDir: 'src/',
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  /**
   * Имена компонентов = имя файла (PascalCase), без префикса папки.
   * Иначе `components/layout/AppToastHost.vue` становится `LayoutAppToastHost`, а в разметке — `AppToastHost`.
   */
  components: [{ path: '~/components', pathPrefix: false }],
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'OTE Manager',
      htmlAttrs: { lang: 'ru' },
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
        },
      ],
    },
  },
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },
  typescript: {
    strict: false,
    typeCheck: false,
  },
})
