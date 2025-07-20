export interface Cattle {
  id: string
  name: string
  ear_tag: string
  color: string
  breed: string
  sex: 'M' | 'F'
  date_of_birth: string
  horn_status: 'HORNED' | 'POLLED' | 'SCURRED' | 'DEHORNED'
  status?: 'active' | 'archived'
  mother?: string
  mother_details?: Cattle
  father?: string
  father_details?: Cattle
  notes?: string
  created_at: string
  updated_at: string
  latest_weight?: number
  age_in_months: number
}

export interface Photo {
  id: string
  cattle: string
  cattle_details?: Cattle
  image: string
  display_url: string
  thumb_url: string
  caption?: string
  tags: string[]
  taken_at?: string
  exif_data?: Record<string, string | number | boolean>
  created_at: string
  updated_at: string
}

export interface WeightLog {
  id: string
  cattle: string
  cattle_details?: Cattle
  weight: number
  weight_date: string
  notes?: string
  created_at: string
  updated_at: string
}

// Statistics types
export interface ColorDistribution {
  color: string
  count: number
  percentage: number
}

export interface BreedDistribution {
  breed: string
  count: number
  percentage: number
}

export interface SummaryStats {
  totals: {
    total: number
    active: number
    archived: number
  }
  bySex: {
    cow: number
    bull: number
    steer: number
    heifer: number
    calf: number
  }
  avgAge: number
}

export interface ColorDistributionResponse {
  total: number
  distribution: ColorDistribution[]
}

export interface BreedDistributionResponse {
  total: number
  distribution: BreedDistribution[]
}

export interface GrowthDataPoint {
  age_months: number
  avg_weight: number
  count: number
}

export interface GrowthStatsResponse {
  year: number
  cattleCount: number
  growthData: GrowthDataPoint[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh: string
}

export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface WeightGrowthData {
  date: string
  weight: number
}

export interface CattleWithGrowth extends Cattle {
  growth_data: WeightGrowthData[]
}

// Basic cattle info for lineage display
export interface CattleBasic {
  id: string
  ear_tag: string
  name: string
  sex: 'M' | 'F'
  date_of_birth?: string
  color: string
  breed: string
  horn_status: string
  age_in_months: number
  created_at: string
  updated_at: string
}

// Lineage response structure
export interface CattleLineage {
  current: Cattle
  parents: {
    father: CattleBasic | null
    mother: CattleBasic | null
  }
  grandparents: {
    paternal_grandfather: CattleBasic | null
    paternal_grandmother: CattleBasic | null
    maternal_grandfather: CattleBasic | null
    maternal_grandmother: CattleBasic | null
  }
  siblings: CattleBasic[]
  offspring: CattleBasic[]
}
