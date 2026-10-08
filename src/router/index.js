import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
// TODO: look into "lazy loading" at some point, ran out of time /M
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import InvoicesView from '../views/InvoicesView.vue'
import MoveFormView from '../views/MoveFormView.vue'
import ProfileView from '../views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/', component: DashboardView, meta: { requiresAuth: true } },
    { path: '/fakturor', component: InvoicesView, meta: { requiresAuth: true } },
    { path: '/flytt', component: MoveFormView, meta: { requiresAuth: true } },
    { path: '/profil', component: ProfileView, meta: { requiresAuth: true } }
  ]
})

// Route guard = användarupplevelse, inte säkerhet. Den hindrar att en utloggad ser en tom sida.
// Skyddet sitter i API:t: utan giltig token får ingen sida några data, guard eller inte.
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // efter omladdning: token är borta ur minnet men cookien finns – försök få en ny först
    const ok = await auth.restore()
    if (!ok) return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.path === '/login' && auth.isAuthenticated) return '/'
})

export default router
