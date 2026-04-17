export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const publicPaths = ['/login']
  if (publicPaths.includes(to.path)) {
    if (auth.isLoggedIn) return navigateTo('/')
    return
  }
  if (!auth.isLoggedIn) return navigateTo('/login')
})
