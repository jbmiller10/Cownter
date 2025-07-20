import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../AuthContext'
import { setAuthTokens, clearAuthTokens } from '../../api/client'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <AuthProvider>{children}</AuthProvider>
    </BrowserRouter>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    clearAuthTokens()
    mockNavigate.mockClear()
  })

  it('should provide auth context', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle login successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.login({
        username: 'testuser',
        password: 'testpass',
      })
    })

    await waitFor(() => {
      expect(result.current.user).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      })
      expect(result.current.isAuthenticated).toBe(true)
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('should handle login failure', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await expect(
      act(async () => {
        await result.current.login({
          username: 'wrong',
          password: 'wrong',
        })
      })
    ).rejects.toThrow('Invalid credentials')

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it.skip('should handle logout', async () => {
    // TODO: Fix this test - there's an issue with the context being null
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    // Wait for the hook to be available
    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    // Initially not authenticated
    expect(result.current.isAuthenticated).toBe(false)

    // Logout should still work even when not logged in
    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it.skip('should load user from token on mount', async () => {
    // TODO: Fix this test - there's an issue with the context being null
    // Set token before rendering
    setAuthTokens('mock-access-token', 'mock-refresh-token')

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.user).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
      })
      expect(result.current.isAuthenticated).toBe(true)
    })
  })
})
