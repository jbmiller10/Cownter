import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { HerdStatistics, WeightGrowthData } from '../types/api';

const STATS_QUERY_KEY = 'statistics';

export const useHerdStatistics = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'herd'],
    queryFn: async () => {
      const { data } = await apiClient.get<HerdStatistics>('/statistics/herd/');
      return data;
    },
  });
};

export const useColorDistribution = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'color-distribution'],
    queryFn: async () => {
      const { data } = await apiClient.get<HerdStatistics['color_distribution']>(
        '/statistics/color-distribution/'
      );
      return data;
    },
  });
};

export const useSexDistribution = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'sex-distribution'],
    queryFn: async () => {
      const { data } = await apiClient.get<HerdStatistics['sex_distribution']>(
        '/statistics/sex-distribution/'
      );
      return data;
    },
  });
};

export const useHornStatusDistribution = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'horn-status-distribution'],
    queryFn: async () => {
      const { data } = await apiClient.get<HerdStatistics['horn_status_distribution']>(
        '/statistics/horn-status-distribution/'
      );
      return data;
    },
  });
};

export const useMonthlyBirths = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'monthly-births'],
    queryFn: async () => {
      const { data } = await apiClient.get<HerdStatistics['monthly_births']>(
        '/statistics/monthly-births/'
      );
      return data;
    },
  });
};

export const useWeightTrends = (cattleId?: string) => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'weight-trends', cattleId],
    queryFn: async () => {
      const url = cattleId 
        ? `/statistics/weight-trends/?cattle=${cattleId}`
        : '/statistics/weight-trends/';
      const { data } = await apiClient.get<WeightGrowthData[]>(url);
      return data;
    },
  });
};

export const useGrowthRates = () => {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'growth-rates'],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        average_daily_gain: number;
        top_performers: Array<{
          cattle_id: string;
          cattle_name: string;
          daily_gain: number;
        }>;
      }>('/statistics/growth-rates/');
      return data;
    },
  });
};