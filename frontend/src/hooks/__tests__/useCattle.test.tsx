import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCattleList, useCattle, useCreateCattle, useUpdateCattle, useDeleteCattle } from '../useCattle';
import { mockCattle } from '../../tests/mocks/mockData';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCattle hooks', () => {
  it('useCattleList should fetch cattle list', async () => {
    const { result } = renderHook(() => useCattleList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      count: mockCattle.length,
      next: null,
      previous: null,
      results: mockCattle,
    });
  });

  it('useCattleList should handle filters', async () => {
    const { result } = renderHook(
      () => useCattleList({ sex: 'F', page_size: 5 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });

  it('useCattle should fetch single cattle', async () => {
    const { result } = renderHook(() => useCattle('cattle-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCattle[0]);
  });

  it('useCreateCattle should create new cattle', async () => {
    const { result } = renderHook(() => useCreateCattle(), {
      wrapper: createWrapper(),
    });

    const newCattle = {
      name: 'New Cow',
      ear_tag: 'A999',
      color: 'BROWN',
      sex: 'F' as const,
      date_of_birth: '2024-01-01',
      horn_status: 'POLLED' as const,
    };

    result.current.mutate(newCattle);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject(newCattle);
    expect(result.current.data?.id).toBeDefined();
  });

  it('useUpdateCattle should update cattle', async () => {
    const { result } = renderHook(() => useUpdateCattle(), {
      wrapper: createWrapper(),
    });

    const updates = {
      id: 'cattle-1',
      name: 'Updated Bessie',
      notes: 'Updated notes',
    };

    result.current.mutate(updates);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.name).toBe('Updated Bessie');
    expect(result.current.data?.notes).toBe('Updated notes');
  });

  it('useDeleteCattle should delete cattle', async () => {
    const { result } = renderHook(() => useDeleteCattle(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('cattle-1');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeUndefined();
  });
});