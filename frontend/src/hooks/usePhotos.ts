import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import { Photo, PaginatedResponse } from '../types/api'

const PHOTOS_QUERY_KEY = 'photos'

interface PhotoFilters {
  page?: number
  page_size?: number
  cattle?: string
  tags?: string[]
  ordering?: string
}

export const usePhotosList = (filters: PhotoFilters = {}) => {
  return useQuery({
    queryKey: [PHOTOS_QUERY_KEY, 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (key === 'tags' && Array.isArray(value)) {
            value.forEach((tag) => params.append('tags', tag))
          } else {
            params.append(key, String(value))
          }
        }
      })
      const { data } = await apiClient.get<PaginatedResponse<Photo>>(
        `/photos/?${params.toString()}`
      )
      return data
    },
  })
}

export const usePhoto = (id: string) => {
  return useQuery({
    queryKey: [PHOTOS_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<Photo>(`/photos/${id}/`)
      return data
    },
    enabled: !!id,
  })
}

export const useUploadPhoto = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      image,
      cattle,
      caption,
      tags,
    }: {
      image: File
      cattle: string
      caption?: string
      tags?: string[]
    }) => {
      const formData = new FormData()
      formData.append('image', image)
      formData.append('cattle', cattle)
      if (caption) formData.append('caption', caption)
      if (tags && tags.length > 0) {
        tags.forEach((tag) => formData.append('tags', tag))
      }

      const { data } = await apiClient.post<Photo>('/photos/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_QUERY_KEY] })
    },
  })
}

export const useBulkUploadPhotos = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      images,
      cattle,
      tags,
    }: {
      images: File[]
      cattle: string
      tags?: string[]
    }) => {
      const formData = new FormData()
      images.forEach((image) => formData.append('images', image))
      formData.append('cattle', cattle)
      if (tags && tags.length > 0) {
        tags.forEach((tag) => formData.append('tags', tag))
      }

      const { data } = await apiClient.post<Photo[]>('/photos/bulk_upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_QUERY_KEY] })
    },
  })
}

export const useUpdatePhoto = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      caption,
      tags,
    }: {
      id: string
      caption?: string
      tags?: string[]
    }) => {
      const { data } = await apiClient.patch<Photo>(`/photos/${id}/`, {
        caption,
        tags,
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_QUERY_KEY] })
      queryClient.setQueryData([PHOTOS_QUERY_KEY, data.id], data)
    },
  })
}

export const useDeletePhoto = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/photos/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_QUERY_KEY] })
    },
  })
}

export const usePhotoTags = () => {
  return useQuery({
    queryKey: [PHOTOS_QUERY_KEY, 'tags'],
    queryFn: async () => {
      const { data } = await apiClient.get<string[]>('/photos/tags/')
      return data
    },
  })
}
