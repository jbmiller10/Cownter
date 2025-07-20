import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CattleDetailPage } from '../CattleDetailPage'
import * as useCattleHook from '../../hooks/useCattle'
import * as useWeightLogsHook from '../../hooks/useWeightLogs'
import * as usePhotosHook from '../../hooks/usePhotos'

const mockCattle = {
  id: '1',
  name: 'Bessie',
  ear_tag: 'A001',
  color: 'Brown',
  sex: 'F' as const,
  date_of_birth: '2020-01-15',
  horn_status: 'POLLED' as const,
  status: 'active' as const,
  mother: '2',
  mother_details: {
    id: '2',
    name: 'Daisy',
    ear_tag: 'A002',
    color: 'Black',
    sex: 'F' as const,
    date_of_birth: '2018-03-20',
    horn_status: 'HORNED' as const,
    age_in_months: 60,
    created_at: '2020-01-01',
    updated_at: '2020-01-01',
  },
  father: null,
  notes: 'Test notes',
  created_at: '2020-01-01',
  updated_at: '2023-01-01',
  latest_weight: 450,
  age_in_months: 36,
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('CattleDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders cattle details correctly', async () => {
    vi.spyOn(useCattleHook, 'useCattle').mockReturnValue({
      data: mockCattle,
      isLoading: false,
      error: null,
    } as any)

    vi.spyOn(useCattleHook, 'useCattleLineage').mockReturnValue({
      data: null,
      isLoading: false,
    } as any)

    vi.spyOn(useWeightLogsHook, 'useCattleWeightHistory').mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.spyOn(usePhotosHook, 'usePhotosList').mockReturnValue({
      data: { results: [], count: 0, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/cattle/1']}>
          <Routes>
            <Route path="/cattle/:id" element={<CattleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Check header - using heading role to be more specific
    expect(screen.getByRole('heading', { name: 'Bessie', level: 1 })).toBeInTheDocument()

    // Check metadata
    expect(screen.getByText('A001')).toBeInTheDocument()
    expect(screen.getByText('36 months')).toBeInTheDocument()
    expect(screen.getByText('450 kg')).toBeInTheDocument()

    // Check chips
    expect(screen.getByText('Brown')).toBeInTheDocument()
    expect(screen.getByText('Cow')).toBeInTheDocument()
    expect(screen.getByText('POLLED')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()

    // Check tabs
    expect(screen.getByRole('tab', { name: 'Info' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Photos' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Growth' })).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.spyOn(useCattleHook, 'useCattle').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/cattle/1']}>
          <Routes>
            <Route path="/cattle/:id" element={<CattleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error state', () => {
    vi.spyOn(useCattleHook, 'useCattle').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any)

    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/cattle/1']}>
          <Routes>
            <Route path="/cattle/:id" element={<CattleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
  })
})
