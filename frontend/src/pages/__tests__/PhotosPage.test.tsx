import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PhotosPage } from '../PhotosPage'
import * as usePhotosHooks from '../../hooks/usePhotos'
import * as useCattleHooks from '../../hooks/useCattle'

vi.mock('../../hooks/usePhotos', () => ({
  usePhotosList: vi.fn(),
  useBulkUploadPhotos: vi.fn(),
  useDeletePhoto: vi.fn(),
  useUpdatePhoto: vi.fn(),
  usePhotoTags: vi.fn(),
}))

vi.mock('../../hooks/useCattle', () => ({
  useCattleList: vi.fn(),
}))

const mockPhotos = [
  {
    id: '1',
    cattle: 'cattle-1',
    image: 'http://example.com/image1.jpg',
    display_url: 'http://example.com/display1.jpg',
    thumb_url: 'http://example.com/thumb1.jpg',
    caption: 'Test photo 1',
    tags: ['tag1', 'tag2'],
    taken_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T12:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
  },
  {
    id: '2',
    cattle: 'cattle-2',
    image: 'http://example.com/image2.jpg',
    display_url: 'http://example.com/display2.jpg',
    thumb_url: 'http://example.com/thumb2.jpg',
    caption: 'Test photo 2',
    tags: [],
    taken_at: null,
    created_at: '2024-01-16T12:00:00Z',
    updated_at: '2024-01-16T12:00:00Z',
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
]

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PhotosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  it('renders loading state initially', () => {
    vi.mocked(usePhotosHooks.usePhotosList).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)
    vi.mocked(useCattleHooks.useCattleList).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)
    vi.mocked(usePhotosHooks.usePhotoTags).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    render(<PhotosPage />, { wrapper: createWrapper() })

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders photos in masonry grid', () => {
    vi.mocked(usePhotosHooks.usePhotosList).mockReturnValue({
      data: { results: mockPhotos, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)
    vi.mocked(useCattleHooks.useCattleList).mockReturnValue({
      data: { results: mockCattle, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)
    vi.mocked(usePhotosHooks.usePhotoTags).mockReturnValue({
      data: ['tag1', 'tag2', 'tag3'],
      isLoading: false,
      error: null,
    } as any)

    render(<PhotosPage />, { wrapper: createWrapper() })

    expect(screen.getByText('Photo Gallery')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /test photo 1/i })).toHaveAttribute(
      'src',
      'http://example.com/thumb1.jpg'
    )
    expect(screen.getByRole('img', { name: /test photo 2/i })).toHaveAttribute(
      'src',
      'http://example.com/thumb2.jpg'
    )
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
  })

  it('shows empty state when no photos', () => {
    vi.mocked(usePhotosHooks.usePhotosList).mockReturnValue({
      data: { results: [], count: 0, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)
    vi.mocked(useCattleHooks.useCattleList).mockReturnValue({
      data: { results: mockCattle, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)

    render(<PhotosPage />, { wrapper: createWrapper() })

    expect(
      screen.getByText('No photos uploaded yet. Click the upload button to add photos.')
    ).toBeInTheDocument()
  })

  it('opens filter dialog when filter button clicked', async () => {
    vi.mocked(usePhotosHooks.usePhotosList).mockReturnValue({
      data: { results: mockPhotos, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)
    vi.mocked(useCattleHooks.useCattleList).mockReturnValue({
      data: { results: mockCattle, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)

    const user = userEvent.setup()
    render(<PhotosPage />, { wrapper: createWrapper() })

    await user.click(screen.getByRole('button', { name: /filters/i }))

    expect(screen.getByText('Filter Photos')).toBeInTheDocument()
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument()
    expect(screen.getByLabelText('End Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Show only untagged photos')).toBeInTheDocument()
  })

  it('opens upload dialog when FAB clicked', async () => {
    vi.mocked(usePhotosHooks.usePhotosList).mockReturnValue({
      data: { results: mockPhotos, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)
    vi.mocked(useCattleHooks.useCattleList).mockReturnValue({
      data: { results: mockCattle, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)

    const user = userEvent.setup()
    render(<PhotosPage />, { wrapper: createWrapper() })

    await user.click(screen.getByLabelText('upload'))

    expect(screen.getByText('Upload Photos')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop images here')).toBeInTheDocument()
  })

  it('shows photo detail dialog when photo clicked', async () => {
    vi.mocked(usePhotosHooks.usePhotosList).mockReturnValue({
      data: { results: mockPhotos, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)
    vi.mocked(useCattleHooks.useCattleList).mockReturnValue({
      data: { results: mockCattle, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)
    vi.mocked(usePhotosHooks.usePhotoTags).mockReturnValue({
      data: ['tag1', 'tag2', 'tag3'],
      isLoading: false,
      error: null,
    } as any)

    const user = userEvent.setup()
    render(<PhotosPage />, { wrapper: createWrapper() })

    await user.click(screen.getByRole('img', { name: /test photo 1/i }))

    expect(screen.getByText('Photo Details')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /test photo 1/i })).toHaveAttribute(
      'src',
      'http://example.com/display1.jpg'
    )
    expect(screen.getByRole('button', { name: /save tags/i })).toBeInTheDocument()
  })

  it('handles file upload via drag and drop', async () => {
    vi.mocked(usePhotosHooks.usePhotosList).mockReturnValue({
      data: { results: [], count: 0, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)
    vi.mocked(useCattleHooks.useCattleList).mockReturnValue({
      data: { results: mockCattle, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)

    const user = userEvent.setup()
    render(<PhotosPage />, { wrapper: createWrapper() })

    await user.click(screen.getByLabelText('upload'))

    const dropZone = screen.getByText('Drag and drop images here').parentElement!
    const file = new File(['test'], 'test.png', { type: 'image/png' })

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    })

    await waitFor(() => {
      expect(screen.getByText('Selected Files (1)')).toBeInTheDocument()
    })
  })

  it('handles photo deletion', async () => {
    const deleteMock = vi.fn().mockResolvedValue({})
    vi.mocked(usePhotosHooks.useDeletePhoto).mockReturnValue({
      mutateAsync: deleteMock,
    } as any)

    vi.mocked(usePhotosHooks.usePhotosList).mockReturnValue({
      data: { results: mockPhotos, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)
    vi.mocked(useCattleHooks.useCattleList).mockReturnValue({
      data: { results: mockCattle, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)

    window.confirm = vi.fn(() => true)

    const user = userEvent.setup()
    render(<PhotosPage />, { wrapper: createWrapper() })

    await user.click(screen.getByRole('img', { name: /test photo 1/i }))
    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this photo?')
    expect(deleteMock).toHaveBeenCalledWith('1')
  })

  it('filters untagged photos', async () => {
    const photosListMock = vi.fn()
    vi.mocked(usePhotosHooks.usePhotosList).mockImplementation(photosListMock)

    photosListMock.mockReturnValue({
      data: { results: mockPhotos, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    })

    vi.mocked(useCattleHooks.useCattleList).mockReturnValue({
      data: { results: mockCattle, count: 2, next: null, previous: null },
      isLoading: false,
      error: null,
    } as any)

    const user = userEvent.setup()
    render(<PhotosPage />, { wrapper: createWrapper() })

    await user.click(screen.getByRole('button', { name: /filters/i }))
    await user.click(screen.getByLabelText('Show only untagged photos'))
    await user.click(screen.getByRole('button', { name: /apply filters/i }))

    await waitFor(() => {
      expect(photosListMock).toHaveBeenLastCalledWith({ untagged: true })
    })
  })
})