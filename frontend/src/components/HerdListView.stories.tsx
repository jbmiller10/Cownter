import type { Meta, StoryObj } from '@storybook/react-vite'
import { HerdListView } from './HerdListView'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { useCattleList, useArchiveCattle } from '../hooks/useCattle'
import type { PaginatedResponse, Cattle } from '../types/api'
import { vi } from 'vitest'

vi.mock('../hooks/useCattle')

const meta = {
  title: 'Components/HerdListView',
  component: HerdListView,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Story />
          </MemoryRouter>
        </QueryClientProvider>
      )
    },
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof HerdListView>

export default meta
type Story = StoryObj<typeof meta>

const mockCattleData: PaginatedResponse<Cattle> = {
  count: 25,
  next: null,
  previous: null,
  results: [
    {
      id: '1',
      name: 'Bessie',
      ear_tag: 'T001',
      color: 'Black and White',
      breed: 'Holstein',
      sex: 'F',
      date_of_birth: '2022-01-15',
      horn_status: 'POLLED',
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      age_in_months: 24,
    },
    {
      id: '2',
      name: 'Ferdinand',
      ear_tag: 'T002',
      color: 'Brown',
      breed: 'Angus',
      sex: 'M',
      date_of_birth: '2021-06-20',
      horn_status: 'HORNED',
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      age_in_months: 30,
    },
    {
      id: '3',
      name: 'Daisy',
      ear_tag: 'T003',
      color: 'Jersey Brown',
      breed: 'Jersey',
      sex: 'F',
      date_of_birth: '2022-03-10',
      horn_status: 'DEHORNED',
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      age_in_months: 22,
    },
    {
      id: '4',
      name: 'Angus',
      ear_tag: 'T004',
      color: 'Black',
      breed: 'Angus',
      sex: 'M',
      date_of_birth: '2020-11-05',
      horn_status: 'POLLED',
      status: 'archived',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      age_in_months: 38,
    },
    {
      id: '5',
      name: 'Buttercup',
      ear_tag: 'T005',
      color: 'Yellow and White',
      breed: 'Guernsey',
      sex: 'F',
      date_of_birth: '2023-01-20',
      horn_status: 'SCURRED',
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      age_in_months: 12,
    },
  ],
}

export const Default: Story = {
  beforeEach: () => {
    vi.mocked(useCattleList).mockReturnValue({
      data: mockCattleData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any)
    vi.mocked(useArchiveCattle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  },
}

export const Loading: Story = {
  beforeEach: () => {
    vi.mocked(useCattleList).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any)
    vi.mocked(useArchiveCattle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  },
}

export const Empty: Story = {
  beforeEach: () => {
    vi.mocked(useCattleList).mockReturnValue({
      data: { count: 0, next: null, previous: null, results: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any)
    vi.mocked(useArchiveCattle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  },
}

export const Error: Story = {
  beforeEach: () => {
    vi.mocked(useCattleList).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to fetch cattle data' } as Error,
      refetch: vi.fn(),
    } as any)
    vi.mocked(useArchiveCattle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  },
}

export const WithManyRows: Story = {
  beforeEach: () => {
    const manyRows = Array.from({ length: 200 }, (_, i) => ({
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

    vi.mocked(useCattleList).mockReturnValue({
      data: {
        count: 200,
        next: null,
        previous: null,
        results: manyRows.slice(0, 10),
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any)
    vi.mocked(useArchiveCattle).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  },
}
