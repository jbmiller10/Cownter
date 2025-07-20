import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PhotosPage } from './PhotosPage'
import * as usePhotosHooks from '../hooks/usePhotos'
import * as useCattleHooks from '../hooks/useCattle'

const meta: Meta<typeof PhotosPage> = {
  title: 'Pages/PhotosPage',
  component: PhotosPage,
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
}

export default meta
type Story = StoryObj<typeof meta>

const mockPhotos = [
  {
    id: '1',
    cattle: 'cattle-1',
    image: 'https://picsum.photos/800/600?random=1',
    display_url: 'https://picsum.photos/800/600?random=1',
    thumb_url: 'https://picsum.photos/300/200?random=1',
    caption: 'Bessie grazing in the north pasture',
    tags: ['grazing', 'north-pasture'],
    taken_at: '2024-01-15T10:00:00Z',
    exif_data: {
      Make: 'Canon',
      Model: 'EOS R5',
      ExposureTime: '1/500',
      FNumber: 5.6,
      ISO: 200,
    },
    created_at: '2024-01-15T12:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
  },
  {
    id: '2',
    cattle: 'cattle-2',
    image: 'https://picsum.photos/600/800?random=2',
    display_url: 'https://picsum.photos/600/800?random=2',
    thumb_url: 'https://picsum.photos/200/300?random=2',
    caption: 'Bull at the water trough',
    tags: ['drinking', 'water-trough'],
    taken_at: '2024-01-16T14:30:00Z',
    created_at: '2024-01-16T15:00:00Z',
    updated_at: '2024-01-16T15:00:00Z',
  },
  {
    id: '3',
    cattle: 'cattle-1',
    image: 'https://picsum.photos/700/500?random=3',
    display_url: 'https://picsum.photos/700/500?random=3',
    thumb_url: 'https://picsum.photos/280/200?random=3',
    caption: 'Bessie with her new calf',
    tags: ['calf', 'mother'],
    taken_at: '2024-01-17T08:00:00Z',
    created_at: '2024-01-17T09:00:00Z',
    updated_at: '2024-01-17T09:00:00Z',
  },
  {
    id: '4',
    cattle: 'cattle-3',
    image: 'https://picsum.photos/900/600?random=4',
    display_url: 'https://picsum.photos/900/600?random=4',
    thumb_url: 'https://picsum.photos/300/200?random=4',
    caption: null,
    tags: [],
    taken_at: null,
    created_at: '2024-01-18T11:00:00Z',
    updated_at: '2024-01-18T11:00:00Z',
  },
  {
    id: '5',
    cattle: 'cattle-2',
    image: 'https://picsum.photos/600/600?random=5',
    display_url: 'https://picsum.photos/600/600?random=5',
    thumb_url: 'https://picsum.photos/200/200?random=5',
    caption: 'Bull in the sunset',
    tags: ['sunset', 'portrait'],
    taken_at: '2024-01-18T17:45:00Z',
    created_at: '2024-01-18T18:00:00Z',
    updated_at: '2024-01-18T18:00:00Z',
  },
  {
    id: '6',
    cattle: 'cattle-4',
    image: 'https://picsum.photos/800/500?random=6',
    display_url: 'https://picsum.photos/800/500?random=6',
    thumb_url: 'https://picsum.photos/320/200?random=6',
    caption: null,
    tags: [],
    taken_at: null,
    created_at: '2024-01-19T10:00:00Z',
    updated_at: '2024-01-19T10:00:00Z',
  },
]

const mockCattle = [
  {
    id: 'cattle-1',
    name: 'Bessie',
    ear_tag: 'ET001',
    color: 'Brown',
    breed: 'Angus',
    sex: 'F' as const,
    date_of_birth: '2020-01-01',
    horn_status: 'POLLED' as const,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2020-01-01T00:00:00Z',
    age_in_months: 48,
  },
  {
    id: 'cattle-2',
    name: 'Bull',
    ear_tag: 'ET002',
    color: 'Black',
    breed: 'Angus',
    sex: 'M' as const,
    date_of_birth: '2019-01-01',
    horn_status: 'HORNED' as const,
    created_at: '2019-01-01T00:00:00Z',
    updated_at: '2019-01-01T00:00:00Z',
    age_in_months: 60,
  },
  {
    id: 'cattle-3',
    name: 'Daisy',
    ear_tag: 'ET003',
    color: 'Black and White',
    breed: 'Holstein',
    sex: 'F' as const,
    date_of_birth: '2021-06-15',
    horn_status: 'POLLED' as const,
    created_at: '2021-06-15T00:00:00Z',
    updated_at: '2021-06-15T00:00:00Z',
    age_in_months: 31,
  },
  {
    id: 'cattle-4',
    name: 'Spot',
    ear_tag: 'ET004',
    color: 'Red and White',
    breed: 'Hereford',
    sex: 'M' as const,
    date_of_birth: '2022-03-20',
    horn_status: 'DEHORNED' as const,
    created_at: '2022-03-20T00:00:00Z',
    updated_at: '2022-03-20T00:00:00Z',
    age_in_months: 22,
  },
]

const existingTags = [
  'grazing',
  'north-pasture',
  'south-pasture',
  'drinking',
  'water-trough',
  'calf',
  'mother',
  'sunset',
  'portrait',
  'feeding',
  'medical',
  'weighing',
]

// Mock the hooks
const setupMocks = (options: {
  photos?: typeof mockPhotos
  isLoading?: boolean
  error?: Error | null
  cattle?: typeof mockCattle
  tags?: string[]
}) => {
  const mockUsePhotosList = usePhotosHooks.usePhotosList as jest.MockedFunction<
    typeof usePhotosHooks.usePhotosList
  >
  const mockUseCattleList = useCattleHooks.useCattleList as jest.MockedFunction<
    typeof useCattleHooks.useCattleList
  >
  const mockUsePhotoTags = usePhotosHooks.usePhotoTags as jest.MockedFunction<
    typeof usePhotosHooks.usePhotoTags
  >
  const mockUseBulkUploadPhotos = usePhotosHooks.useBulkUploadPhotos as jest.MockedFunction<
    typeof usePhotosHooks.useBulkUploadPhotos
  >
  const mockUseDeletePhoto = usePhotosHooks.useDeletePhoto as jest.MockedFunction<
    typeof usePhotosHooks.useDeletePhoto
  >
  const mockUseUpdatePhoto = usePhotosHooks.useUpdatePhoto as jest.MockedFunction<
    typeof usePhotosHooks.useUpdatePhoto
  >

  mockUsePhotosList.mockReturnValue({
    data: options.photos
      ? { results: options.photos, count: options.photos.length, next: null, previous: null }
      : undefined,
    isLoading: options.isLoading ?? false,
    error: options.error ?? null,
  } as any)

  mockUseCattleList.mockReturnValue({
    data: options.cattle
      ? { results: options.cattle, count: options.cattle.length, next: null, previous: null }
      : undefined,
    isLoading: false,
    error: null,
  } as any)

  mockUsePhotoTags.mockReturnValue({
    data: options.tags ?? existingTags,
    isLoading: false,
    error: null,
  } as any)

  mockUseBulkUploadPhotos.mockReturnValue({
    mutateAsync: async () => Promise.resolve([]),
    isLoading: false,
  } as any)

  mockUseDeletePhoto.mockReturnValue({
    mutateAsync: async () => Promise.resolve(),
    isLoading: false,
  } as any)

  mockUseUpdatePhoto.mockReturnValue({
    mutateAsync: async () => Promise.resolve({} as any),
    isLoading: false,
  } as any)
}

export const Default: Story = {
  beforeEach: () => {
    setupMocks({
      photos: mockPhotos,
      cattle: mockCattle,
    })
  },
}

export const Loading: Story = {
  beforeEach: () => {
    setupMocks({
      isLoading: true,
    })
  },
}

export const Empty: Story = {
  beforeEach: () => {
    setupMocks({
      photos: [],
      cattle: mockCattle,
    })
  },
}

export const Error: Story = {
  beforeEach: () => {
    setupMocks({
      error: new Error('Failed to load photos'),
    })
  },
}

export const OnlyUntaggedPhotos: Story = {
  beforeEach: () => {
    setupMocks({
      photos: mockPhotos.filter((p) => p.tags.length === 0),
      cattle: mockCattle,
    })
  },
}

export const ManyPhotos: Story = {
  beforeEach: () => {
    const manyPhotos = []
    for (let i = 0; i < 50; i++) {
      manyPhotos.push({
        id: `photo-${i}`,
        cattle: mockCattle[i % mockCattle.length].id,
        image: `https://picsum.photos/800/600?random=${i + 10}`,
        display_url: `https://picsum.photos/800/600?random=${i + 10}`,
        thumb_url: `https://picsum.photos/300/200?random=${i + 10}`,
        caption: i % 3 === 0 ? `Photo ${i} caption` : null,
        tags: i % 2 === 0 ? ['tag1', 'tag2'] : [],
        taken_at: i % 4 === 0 ? `2024-01-${String(i % 30 + 1).padStart(2, '0')}T10:00:00Z` : null,
        created_at: `2024-01-${String(i % 30 + 1).padStart(2, '0')}T12:00:00Z`,
        updated_at: `2024-01-${String(i % 30 + 1).padStart(2, '0')}T12:00:00Z`,
      })
    }
    setupMocks({
      photos: manyPhotos,
      cattle: mockCattle,
    })
  },
}