import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as api from '../services/api'
import { getAccessToken, setAccessToken } from '../services/token'

// Vem är inloggad? Sanningen är access token i minnet (services/token.js) – storen är
// det appen tittar på. "Inloggad" betyder: vi har en token som API:t godtar.
export const useAuthStore = defineStore('auth', () => {
  const name = ref(null)
  const restored = ref(false) // har vi frågat efter en ny token efter omladdning?

  const isAuthenticated = computed(() => Boolean(getAccessToken()))

  const login = async (email, password) => {
    const data = await api.login(email, password)
    name.value = data.name
  }

  const logout = async () => {
    await api.logout()
    name.value = null
  }

  // Vid omladdning är token borta ur minnet. Cookien finns kvar – be API:t om en ny.
  // Görs en gång; svarar API:t 401 finns ingen session och användaren får logga in.
  const restore = async () => {
    if (restored.value) return isAuthenticated.value
    restored.value = true
    try {
      const data = await api.refresh()
      if (data) name.value = data.name
    } catch {
      setAccessToken(null)
    }
    return isAuthenticated.value
  }

  return { name, isAuthenticated, login, logout, restore }
})
