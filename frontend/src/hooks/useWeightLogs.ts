import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { WeightLog, PaginatedResponse } from '../types/api';

const WEIGHT_LOGS_QUERY_KEY = 'weight-logs';

interface WeightLogFilters {
  page?: number;
  page_size?: number;
  cattle?: string;
  start_date?: string;
  end_date?: string;
  ordering?: string;
}

export const useWeightLogsList = (filters: WeightLogFilters = {}) => {
  return useQuery({
    queryKey: [WEIGHT_LOGS_QUERY_KEY, 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
      const { data } = await apiClient.get<PaginatedResponse<WeightLog>>(
        `/weight-logs/?${params.toString()}`
      );
      return data;
    },
  });
};

export const useWeightLog = (id: string) => {
  return useQuery({
    queryKey: [WEIGHT_LOGS_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<WeightLog>(`/weight-logs/${id}/`);
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateWeightLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (weightLogData: Omit<WeightLog, 'id' | 'created_at' | 'updated_at'>) => {
      const { data } = await apiClient.post<WeightLog>('/weight-logs/', weightLogData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEIGHT_LOGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['cattle'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });
};

export const useUpdateWeightLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...weightLogData
    }: Partial<WeightLog> & { id: string }) => {
      const { data } = await apiClient.patch<WeightLog>(`/weight-logs/${id}/`, weightLogData);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [WEIGHT_LOGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['cattle'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      queryClient.setQueryData([WEIGHT_LOGS_QUERY_KEY, data.id], data);
    },
  });
};

export const useDeleteWeightLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/weight-logs/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEIGHT_LOGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['cattle'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });
};

export const useBulkCreateWeightLogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      weightLogs: Array<Omit<WeightLog, 'id' | 'created_at' | 'updated_at'>>
    ) => {
      const { data } = await apiClient.post<WeightLog[]>('/weight-logs/bulk_create/', {
        weight_logs: weightLogs,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEIGHT_LOGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['cattle'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });
};

export const useCattleWeightHistory = (cattleId: string) => {
  return useQuery({
    queryKey: [WEIGHT_LOGS_QUERY_KEY, 'cattle', cattleId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<WeightLog>>(
        `/weight-logs/?cattle=${cattleId}&ordering=-weight_date`
      );
      return data.results;
    },
    enabled: !!cattleId,
  });
};