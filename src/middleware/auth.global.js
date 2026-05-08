/**
 * Только проверка Pinia: сессия поднимается в plugins/auth-hydrate.js (после Pinia) и Nitro 00-auth-context.
 * Здесь не дергаем API сессии — гидратация в plugins/auth-hydrate.js (эндпоинт /api/auth/session).
 */
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  /** Ссылка приглашения обрабатывается Nitro (редирект); без входа её нельзя гонять через login. */
  if (to.path === '/invite') {
    return
  }

  const publicPaths = ['/login']

  if (publicPaths.includes(to.path)) {
    if (auth.isLoggedIn) return navigateTo('/')
    return
  }

  if (!auth.isLoggedIn) {
    if (to.path === '/invite/confirm') {
      return navigateTo({ path: '/login', query: { return: '/invite/confirm' } })
    }
    return navigateTo('/login')
  }
})
