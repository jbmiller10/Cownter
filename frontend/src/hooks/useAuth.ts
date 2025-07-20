import { useMutation } from '@tanstack/react-query'
import { apiClient, clearAuthTokens } from '../api/client'

interface RegisterRequest {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
}

interface RegisterResponse {
  id: number
  username: string
  email: string
}

interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

export const useRegister = () => {
  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const response = await apiClient.post<RegisterResponse>('/auth/register/', data)
      return response.data
    },
  })
}

export const useLogout = () => {
  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post('/auth/logout/')
      } finally {
        clearAuthTokens()
        window.location.href = '/login'
      }
    },
  })
}

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data: ChangePasswordRequest) => {
      const response = await apiClient.post('/auth/change-password/', data)
      return response.data
    },
  })
}

export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.post('/auth/password-reset/', { email })
      return response.data
    },
  })
}

export const useConfirmPasswordReset = () => {
  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const response = await apiClient.post('/auth/password-reset-confirm/', {
        token,
        password,
      })
      return response.data
    },
  })
}
