import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LineageTree } from '../LineageTree'
import { useCattleLineage } from '../../../hooks/useCattle'
import type { Cattle, CattleLineage } from '../../../types/api'

vi.mock('../../../hooks/useCattle')

const mockCattle: Cattle = {
  id: '1',
  name: 'Bessie',
  ear_tag: 'T001',
  color: 'Black',
  breed: 'Angus',
  sex: 'F',
  date_of_birth: '2022-01-15',
  horn_status: 'POLLED',
  status: 'active',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  age_in_months: 24,
}

const mockLineageData: CattleLineage = {
  current: mockCattle,
  parents: {
    father: {
      id: '2',
      ear_tag: 'T002',
      name: 'Thunder',
      sex: 'M',
      date_of_birth: '2020-01-15',
      color: 'Brown',
      breed: 'Angus',
      horn_status: 'HORNED',
      age_in_months: 48,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    mother: {
      id: '3',
      ear_tag: 'T003',
      name: 'Daisy',
      sex: 'F',
      date_of_birth: '2020-06-20',
      color: 'Black and White',
      breed: 'Holstein',
      horn_status: 'POLLED',
      age_in_months: 42,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  },
  grandparents: {
    paternal_grandfather: {
      id: '4',
      ear_tag: 'T004',
      name: 'Rex',
      sex: 'M',
      date_of_birth: '2018-03-10',
      color: 'Red',
      breed: 'Hereford',
      horn_status: 'POLLED',
      age_in_months: 70,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    paternal_grandmother: null,
    maternal_grandfather: null,
    maternal_grandmother: null,
  },
  siblings: [
    {
      id: '5',
      ear_tag: 'T005',
      name: 'Belle',
      sex: 'F',
      date_of_birth: '2022-03-20',
      color: 'Brown',
      breed: 'Angus',
      horn_status: 'POLLED',
      age_in_months: 22,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
  ],
  offspring: [],
}

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <LineageTree cattleId="1" cattle={mockCattle} />
    </QueryClientProvider>
  )
}

describe('LineageTree', () => {
  it('displays loading state', () => {
    vi.mocked(useCattleLineage).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any)

    const { container } = renderComponent()
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument()
  })

  it('displays family tree with all lineage data', () => {
    vi.mocked(useCattleLineage).mockReturnValue({
      data: mockLineageData,
      isLoading: false,
      error: null,
    } as any)

    renderComponent()

    // Check title
    expect(screen.getByText('Family Tree')).toBeInTheDocument()

    // Check parents section
    expect(screen.getByText('Parents')).toBeInTheDocument()
    expect(screen.getByText('Thunder')).toBeInTheDocument()
    expect(screen.getByText('T002')).toBeInTheDocument()
    expect(screen.getByText('Daisy')).toBeInTheDocument()
    expect(screen.getByText('T003')).toBeInTheDocument()

    // Check grandparents section
    expect(screen.getByText('Grandparents')).toBeInTheDocument()
    expect(screen.getByText('Rex')).toBeInTheDocument()
    expect(screen.getByText('T004')).toBeInTheDocument()

    // Check siblings section
    expect(screen.getByText('Siblings')).toBeInTheDocument()
    expect(screen.getByText('Belle')).toBeInTheDocument()
    expect(screen.getByText('T005')).toBeInTheDocument()

    // Check current animal
    expect(screen.getByText('Current Animal')).toBeInTheDocument()
    expect(screen.getByText('Bessie')).toBeInTheDocument()

    // Check statistics
    expect(screen.getByText('3 Generations')).toBeInTheDocument()
    // Known relatives: father + mother + paternal grandfather + 1 sibling = 4
    const stats = screen.getByText('Known Relatives').closest('div')
    expect(stats?.textContent).toContain('4')
  })

  it('displays no lineage message when data is unavailable', () => {
    vi.mocked(useCattleLineage).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any)

    renderComponent()
    expect(screen.getByText('No lineage information available')).toBeInTheDocument()
  })

  it('handles cattle with offspring', () => {
    const lineageWithOffspring: CattleLineage = {
      ...mockLineageData,
      offspring: [
        {
          id: '6',
          ear_tag: 'T006',
          name: 'Junior',
          sex: 'M',
          date_of_birth: '2024-01-15',
          color: 'Black',
          breed: 'Angus',
          horn_status: 'POLLED',
          age_in_months: 6,
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
      ],
    }

    vi.mocked(useCattleLineage).mockReturnValue({
      data: lineageWithOffspring,
      isLoading: false,
      error: null,
    } as any)

    renderComponent()

    // Check offspring section
    expect(screen.getByText('Offspring')).toBeInTheDocument()
    expect(screen.getByText('Junior')).toBeInTheDocument()
    expect(screen.getByText('T006')).toBeInTheDocument()
    
    // Check offspring count in statistics
    const offspringCount = screen.getByText('Offspring Count').closest('div')
    expect(offspringCount?.textContent).toContain('1')
  })
})