import { userHasAdminRole } from '~/constants/rbac'

export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()
  if (!auth.isLoggedIn || !userHasAdminRole(auth.user?.roles)) {
    return navigateTo('/')
  }
})
