import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'
import {
  SummaryStats,
  ColorDistributionResponse,
  BreedDistributionResponse,
  GrowthStatsResponse,
} from '../types/api'

const STATS_QUERY_KEY = 'statistics'

export const useHerdStatistics = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<SummaryStats>('/stats/summary/')
      return data
    },
  })
}

export const useColorDistribution = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'color'],
    queryFn: async () => {
      const { data } = await apiClient.get<ColorDistributionResponse>('/stats/color/')
      return data
    },
  })
}

export const useBreedDistribution = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'breed'],
    queryFn: async () => {
      const { data } = await apiClient.get<BreedDistributionResponse>('/stats/breed/')
      return data
    },
  })
}

export const useGrowthStats = (year: number) => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'growth', year],
    queryFn: async () => {
      const { data } = await apiClient.get<GrowthStatsResponse>(
        `/stats/growth/?year=${year}`
      )
      return data
    },
    enabled: !!year,
  })
}

// Calculate calves per year from summary data
export const useCalvesPerYear = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'calves-per-year'],
    queryFn: async () => {
      // Get all cattle to calculate births per year
      const { data } = await apiClient.get<{ results: Array<{ date_of_birth: string | null }> }>(
        '/cattle/?limit=1000'
      )
      
      const birthsByYear: Record<number, number> = {}
      const currentYear = new Date().getFullYear()
      const fiveYearsAgo = currentYear - 5
      
      // Initialize years
      for (let year = fiveYearsAgo; year <= currentYear; year++) {
        birthsByYear[year] = 0
      }
      
      // Count births by year
      data.results.forEach((cattle) => {
        if (cattle.date_of_birth) {
          const year = new Date(cattle.date_of_birth).getFullYear()
          if (year >= fiveYearsAgo && year <= currentYear) {
            birthsByYear[year] = (birthsByYear[year] || 0) + 1
          }
        }
      })
      
      // Convert to array format
      return Object.entries(birthsByYear)
        .map(([year, count]) => ({
          year: parseInt(year),
          count,
        }))
        .sort((a, b) => a.year - b.year)
    },
  })
}
