import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  apiClient,
  setAuthTokens,
  clearAuthTokens,
  getAuthToken,
  setNavigationCallback,
} from '../api/client'
import { LoginRequest, LoginResponse, User } from '../types/api'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const fetchUser = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      const { data } = await apiClient.get<User>('/auth/user/')
      setUser(data)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      clearAuthTokens()
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Set up navigation callback for API client
    setNavigationCallback((path: string) => {
      navigate(path, { replace: true })
    })

    void fetchUser()
  }, [navigate])

  const login = async (credentials: LoginRequest) => {
    try {
      const { data } = await apiClient.post<LoginResponse>('/auth/login/', credentials)
      setAuthTokens(data.access, data.refresh)

      const userResponse = await apiClient.get<User>('/auth/user/')
      setUser(userResponse.data)

      navigate('/')
    } catch (error: any) {
      clearAuthTokens()
      throw new Error(error.response?.data?.detail || 'Invalid credentials')
    }
  }

  const logout = () => {
    clearAuthTokens()
    setUser(null)
    navigate('/login')
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
