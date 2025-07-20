import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { HerdListView } from '../HerdListView'
import { useCattleList, useArchiveCattle } from '../../hooks/useCattle'
import type { PaginatedResponse, Cattle } from '../../types/api'

vi.mock('../../hooks/useCattle')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockCattleData: PaginatedResponse<Cattle> = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: '1',
      name: 'Bessie',
      ear_tag: 'T001',
      color: 'Black',
      sex: 'F',
      date_of_birth: '2022-01-15',
      horn_status: 'POLLED',
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      age_in_months: 12,
    },
    {
      id: '2',
      name: 'Bull',
      ear_tag: 'T002',
      color: 'Brown',
      sex: 'M',
      date_of_birth: '2021-06-20',
      horn_status: 'HORNED',
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      age_in_months: 18,
    },
  ],
}

const mockArchiveMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
}

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HerdListView />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('HerdListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCattleList).mockReturnValue({
      data: mockCattleData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any)
    vi.mocked(useArchiveCattle).mockReturnValue(mockArchiveMutation as any)
  })

  it('renders the component with title and add button', () => {
    renderComponent()

    expect(screen.getByText('Herd Management')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add cattle/i })).toBeInTheDocument()
  })

  it('renders cattle data in the DataGrid', () => {
    renderComponent()

    expect(screen.getByText('Bessie')).toBeInTheDocument()
    expect(screen.getByText('T001')).toBeInTheDocument()
    expect(screen.getByText('Black')).toBeInTheDocument()
    expect(screen.getByText('Cow')).toBeInTheDocument()

    expect(screen.getByText('Bull')).toBeInTheDocument()
    expect(screen.getByText('T002')).toBeInTheDocument()
    expect(screen.getByText('Brown')).toBeInTheDocument()
  })

  it('handles search input', async () => {
    const user = userEvent.setup()
    renderComponent()

    const searchInput = screen.getByPlaceholderText(/quick search/i)
    await user.type(searchInput, 'Bessie')

    expect(searchInput).toHaveValue('Bessie')
    expect(vi.mocked(useCattleList)).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Bessie',
      })
    )
  })

  it('handles row click navigation', async () => {
    renderComponent()

    const row = screen.getByText('Bessie').closest('tr')
    if (row) {
      fireEvent.click(row)
      expect(mockNavigate).toHaveBeenCalledWith('/cattle/1')
    }
  })

  it('displays loading state', () => {
    vi.mocked(useCattleList).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any)

    renderComponent()

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays error state', () => {
    const errorMessage = 'Failed to load cattle'
    vi.mocked(useCattleList).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: errorMessage } as Error,
      refetch: vi.fn(),
    } as any)

    renderComponent()

    expect(screen.getByText(`Error loading cattle: ${errorMessage}`)).toBeInTheDocument()
  })

  it('displays empty state when no cattle exist', () => {
    vi.mocked(useCattleList).mockReturnValue({
      data: { count: 0, next: null, previous: null, results: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any)

    renderComponent()

    expect(screen.getByText('No cattle in your herd yet')).toBeInTheDocument()
    expect(screen.getByText('Add your first cattle to get started')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add first cattle/i })).toBeInTheDocument()
  })

  it('opens action menu and handles archive', async () => {
    const user = userEvent.setup()
    renderComponent()

    const menuButtons = screen.getAllByLabelText('Menu')
    await user.click(menuButtons[0])

    expect(screen.getByText('View Details')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Archive')).toBeInTheDocument()

    await user.click(screen.getByText('Archive'))

    expect(mockArchiveMutation.mutateAsync).toHaveBeenCalledWith('1')
  })

  it('shows success message after archiving', async () => {
    mockArchiveMutation.mutateAsync.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    renderComponent()

    const menuButtons = screen.getAllByLabelText('Menu')
    await user.click(menuButtons[0])
    await user.click(screen.getByText('Archive'))

    await waitFor(() => {
      expect(screen.getByText('Cattle archived successfully')).toBeInTheDocument()
    })
  })

  it('shows error message when archiving fails', async () => {
    mockArchiveMutation.mutateAsync.mockRejectedValueOnce(new Error('Archive failed'))
    const user = userEvent.setup()
    renderComponent()

    const menuButtons = screen.getAllByLabelText('Menu')
    await user.click(menuButtons[0])
    await user.click(screen.getByText('Archive'))

    await waitFor(() => {
      expect(screen.getByText('Failed to archive cattle')).toBeInTheDocument()
    })
  })

  it('handles pagination', async () => {
    renderComponent()

    const nextPageButton = screen.getByLabelText('Go to next page')
    fireEvent.click(nextPageButton)

    expect(vi.mocked(useCattleList)).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
      })
    )
  })
})