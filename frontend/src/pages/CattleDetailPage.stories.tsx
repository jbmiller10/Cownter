import type { Meta, StoryObj } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { CattleDetailPage } from './CattleDetailPage'
import * as useCattleHook from '../hooks/useCattle'
import * as useWeightLogsHook from '../hooks/useWeightLogs'
import * as usePhotosHook from '../hooks/usePhotos'

const meta = {
  title: 'Pages/CattleDetailPage',
  component: CattleDetailPage,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      })
      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/cattle/1']}>
            <Routes>
              <Route path="/cattle/:id" element={<Story />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    },
  ],
} satisfies Meta<typeof CattleDetailPage>

export default meta
type Story = StoryObj<typeof meta>

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
  father: '3',
  father_details: {
    id: '3',
    name: 'Thunder',
    ear_tag: 'B001',
    color: 'Black',
    sex: 'M' as const,
    date_of_birth: '2017-05-10',
    horn_status: 'HORNED' as const,
    age_in_months: 72,
    created_at: '2020-01-01',
    updated_at: '2020-01-01',
  },
  notes: 'Prize winning cow with excellent genetics. Gentle temperament and good mother.',
  created_at: '2020-01-01',
  updated_at: '2023-01-01',
  latest_weight: 450,
  age_in_months: 36,
}

const mockWeightHistory = [
  {
    id: '1',
    cattle: '1',
    weight: 50,
    weight_date: '2020-02-15',
    created_at: '2020-02-15',
    updated_at: '2020-02-15',
  },
  {
    id: '2',
    cattle: '1',
    weight: 150,
    weight_date: '2020-08-15',
    created_at: '2020-08-15',
    updated_at: '2020-08-15',
  },
  {
    id: '3',
    cattle: '1',
    weight: 300,
    weight_date: '2021-02-15',
    created_at: '2021-02-15',
    updated_at: '2021-02-15',
  },
  {
    id: '4',
    cattle: '1',
    weight: 400,
    weight_date: '2022-02-15',
    created_at: '2022-02-15',
    updated_at: '2022-02-15',
  },
  {
    id: '5',
    cattle: '1',
    weight: 450,
    weight_date: '2023-01-01',
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
  },
]

const mockPhotos = {
  count: 3,
  next: null,
  previous: null,
  results: [
    {
      id: '1',
      cattle: '1',
      image: 'https://via.placeholder.com/400x300',
      display_url: 'https://via.placeholder.com/400x300',
      thumb_url: 'https://via.placeholder.com/150x150',
      caption: 'Bessie at the county fair',
      tags: ['fair', 'show'],
      taken_at: '2022-08-15',
      created_at: '2022-08-16',
      updated_at: '2022-08-16',
    },
    {
      id: '2',
      cattle: '1',
      image: 'https://via.placeholder.com/400x300',
      display_url: 'https://via.placeholder.com/400x300',
      thumb_url: 'https://via.placeholder.com/150x150',
      caption: 'Spring grazing',
      tags: ['pasture', 'spring'],
      created_at: '2022-04-10',
      updated_at: '2022-04-10',
    },
    {
      id: '3',
      cattle: '1',
      image: 'https://via.placeholder.com/400x300',
      display_url: 'https://via.placeholder.com/400x300',
      thumb_url: 'https://via.placeholder.com/150x150',
      caption: null,
      tags: [],
      created_at: '2021-12-25',
      updated_at: '2021-12-25',
    },
  ],
}

export const Default: Story = {
  beforeEach: () => {
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
      data: mockWeightHistory,
      isLoading: false,
    } as any)

    vi.spyOn(usePhotosHook, 'usePhotosList').mockReturnValue({
      data: mockPhotos,
      isLoading: false,
      error: null,
    } as any)
  },
}

export const Loading: Story = {
  beforeEach: () => {
    vi.spyOn(useCattleHook, 'useCattle').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)
  },
}

export const NoLineage: Story = {
  beforeEach: () => {
    const cattleWithoutLineage = {
      ...mockCattle,
      mother: null,
      mother_details: null,
      father: null,
      father_details: null,
    }

    vi.spyOn(useCattleHook, 'useCattle').mockReturnValue({
      data: cattleWithoutLineage,
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
  },
}
