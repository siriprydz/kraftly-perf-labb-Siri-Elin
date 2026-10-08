import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'
import * as api from '../services/api'
import { setAccessToken } from '../services/token'

vi.mock('../services/api', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  refresh: vi.fn()
}))

beforeEach(() => {
  setActivePinia(createPinia())
  setAccessToken(null)
  vi.clearAllMocks()
})

describe('auth store', () => {
  it('är utloggad från början', () => {
    expect(useAuthStore().isAuthenticated).toBe(false)
  })

  it('login sätter namnet och inloggat läge', async () => {
    api.login.mockImplementation(async () => {
      setAccessToken('tok')
      return { name: 'Anna Andersson' }
    })
    const auth = useAuthStore()
    await auth.login('anna.andersson@example.com', 'kraftly-anna')
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.name).toBe('Anna Andersson')
  })

  it('restore efter omladdning: refresh lyckas → inloggad utan att fråga om lösenord', async () => {
    api.refresh.mockImplementation(async () => {
      setAccessToken('ny')
      return { name: 'Anna Andersson' }
    })
    const auth = useAuthStore()
    expect(await auth.restore()).toBe(true)
    expect(auth.name).toBe('Anna Andersson')
  })

  it('restore utan session: refresh svarar null → utloggad, och frågar bara en gång', async () => {
    api.refresh.mockResolvedValue(null)
    const auth = useAuthStore()
    expect(await auth.restore()).toBe(false)
    expect(await auth.restore()).toBe(false)
    expect(api.refresh).toHaveBeenCalledTimes(1)
  })

  it('logout tömmer namnet', async () => {
    api.logout.mockImplementation(async () => setAccessToken(null))
    setAccessToken('tok')
    const auth = useAuthStore()
    auth.name = 'Anna'
    await auth.logout()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.name).toBeNull()
  })
})
