import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import { Cattle, PaginatedResponse, CattleLineage } from '../types/api'

const CATTLE_QUERY_KEY = 'cattle'

interface CattleFilters {
  page?: number
  page_size?: number
  search?: string
  sex?: 'M' | 'F'
  color?: string
  ordering?: string
}

export const useCattleList = (filters: CattleFilters = {}) => {
  return useQuery({
    queryKey: [CATTLE_QUERY_KEY, 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value))
        }
      })
      const { data } = await apiClient.get<PaginatedResponse<Cattle>>(
        `/cattle/?${params.toString()}`
      )
      return data
    },
  })
}

export const useCattle = (id: string) => {
  return useQuery({
    queryKey: [CATTLE_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<Cattle>(`/cattle/${id}/`)
      return data
    },
    enabled: !!id,
  })
}

export const useCreateCattle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cattleData: Partial<Cattle>) => {
      const { data } = await apiClient.post<Cattle>('/cattle/', cattleData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATTLE_QUERY_KEY] })
    },
  })
}

export const useUpdateCattle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...cattleData }: Partial<Cattle> & { id: string }) => {
      const { data } = await apiClient.patch<Cattle>(`/cattle/${id}/`, cattleData)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [CATTLE_QUERY_KEY] })
      queryClient.setQueryData([CATTLE_QUERY_KEY, data.id], data)
    },
  })
}

export const useDeleteCattle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/cattle/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATTLE_QUERY_KEY] })
    },
  })
}

export const useCattleLineage = (id: string) => {
  return useQuery({
    queryKey: [CATTLE_QUERY_KEY, id, 'lineage'],
    queryFn: async () => {
      const { data } = await apiClient.get<CattleLineage>(`/cattle/${id}/lineage/`)
      return data
    },
    enabled: !!id,
  })
}

export const useArchiveCattle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/cattle/${id}/archive/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATTLE_QUERY_KEY] })
    },
  })
}
