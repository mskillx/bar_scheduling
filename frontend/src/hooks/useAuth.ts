import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth'
import type { LoginRequest } from '@/types/auth'

export function useAuth() {
  const { user, setTokens, setUser, logout: storeLogout, isAdmin } = useAuthStore()
  const navigate = useNavigate()

  const login = useCallback(
    async (data: LoginRequest) => {
      const tokens = await authApi.login(data)
      setTokens(tokens.access_token, tokens.refresh_token)
      const me = await authApi.me()
      setUser(me)
      return me
    },
    [setTokens, setUser]
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {}
    storeLogout()
    navigate('/login')
  }, [storeLogout, navigate])

  return { user, login, logout, isAdmin: isAdmin() }
}
