import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useWeightLogsList,
  useWeightLog,
  useCreateWeightLog,
  useUpdateWeightLog,
  useDeleteWeightLog,
  useCattleWeightHistory,
} from '../useWeightLogs'
import { mockWeightLogs } from '../../tests/mocks/mockData'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useWeightLogs hooks', () => {
  it('useWeightLogsList should fetch weight logs', async () => {
    const { result } = renderHook(() => useWeightLogsList(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      count: mockWeightLogs.length,
      next: null,
      previous: null,
      results: mockWeightLogs,
    })
  })

  it('useWeightLogsList should handle filters', async () => {
    const { result } = renderHook(
      () => useWeightLogsList({ cattle: 'cattle-1', start_date: '2024-01-01' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.results).toBeDefined()
    expect(result.current.data?.results.every((log) => log.cattle === 'cattle-1')).toBe(true)
  })

  it('useWeightLog should fetch single weight log', async () => {
    const { result } = renderHook(() => useWeightLog('log-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockWeightLogs[0])
  })

  it('useCreateWeightLog should create new weight log', async () => {
    const { result } = renderHook(() => useCreateWeightLog(), {
      wrapper: createWrapper(),
    })

    const newLog = {
      cattle: 'cattle-1',
      weight: 575,
      weight_date: '2024-02-15',
      notes: 'Monthly weigh-in',
    }

    result.current.mutate(newLog)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toMatchObject(newLog)
    expect(result.current.data?.id).toBeDefined()
  })

  it('useUpdateWeightLog should update weight log', async () => {
    const { result } = renderHook(() => useUpdateWeightLog(), {
      wrapper: createWrapper(),
    })

    const updates = {
      id: 'log-1',
      weight: 560,
      notes: 'Corrected weight',
    }

    result.current.mutate(updates)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.weight).toBe(560)
    expect(result.current.data?.notes).toBe('Corrected weight')
  })

  it('useDeleteWeightLog should delete weight log', async () => {
    const { result } = renderHook(() => useDeleteWeightLog(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('log-1')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeUndefined()
  })

  it('useCattleWeightHistory should fetch weight history for specific cattle', async () => {
    const { result } = renderHook(() => useCattleWeightHistory('cattle-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
  })
})
