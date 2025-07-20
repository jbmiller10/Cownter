import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { HerdListView } from '../HerdListView'
import { useCattleList, useArchiveCattle } from '../../hooks/useCattle'
import type { PaginatedResponse, Cattle } from '../../types/api'

vi.mock('../../hooks/useCattle')

const generateMockCattle = (count: number): Cattle[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i + 1}`,
    name: `Cattle ${i + 1}`,
    ear_tag: `T${String(i + 1).padStart(3, '0')}`,
    color: ['Black', 'Brown', 'White', 'Spotted', 'Red'][i % 5],
    sex: i % 2 === 0 ? ('F' as const) : ('M' as const),
    date_of_birth: new Date(2020 + (i % 4), i % 12, (i % 28) + 1).toISOString().split('T')[0],
    horn_status: (['HORNED', 'POLLED', 'SCURRED', 'DEHORNED'] as const)[i % 4],
    status: i % 10 === 0 ? ('archived' as const) : ('active' as const),
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    age_in_months: 12 + (i % 36),
  }))
}

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{component}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('HerdListView Performance', () => {
  beforeEach(() => {
    vi.mocked(useArchiveCattle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  })

  it('renders 200 rows in less than 100ms', () => {
    const mockData: PaginatedResponse<Cattle> = {
      count: 200,
      next: null,
      previous: null,
      results: generateMockCattle(200),
    }

    vi.mocked(useCattleList).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    const startTime = performance.now()
    const { container } = renderWithProviders(<HerdListView />)
    const endTime = performance.now()
    const renderTime = endTime - startTime

    console.log(`Render time for 200 rows: ${renderTime.toFixed(2)}ms`)

    // Check that rows are rendered
    const rows = container.querySelectorAll('.MuiDataGrid-row')
    expect(rows.length).toBeGreaterThan(0)

    // Performance assertion
    expect(renderTime).toBeLessThan(100)
  })

  it('handles pagination efficiently with large datasets', () => {
    const mockData: PaginatedResponse<Cattle> = {
      count: 1000,
      next: 'http://api/cattle?page=2',
      previous: null,
      results: generateMockCattle(10), // Only 10 per page
    }

    vi.mocked(useCattleList).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    const startTime = performance.now()
    renderWithProviders(<HerdListView />)
    const endTime = performance.now()
    const renderTime = endTime - startTime

    console.log(`Render time for paginated view: ${renderTime.toFixed(2)}ms`)

    // Should render quickly since only showing 10 items
    expect(renderTime).toBeLessThan(50)
  })
})