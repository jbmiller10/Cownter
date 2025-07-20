import { Cattle, Photo, WeightLog, HerdStatistics, User } from '../../types/api'

export const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
}

export const mockCattle: Cattle[] = [
  {
    id: 'cattle-1',
    name: 'Bessie',
    ear_tag: 'A001',
    color: 'BLACK',
    sex: 'F',
    date_of_birth: '2022-01-15',
    horn_status: 'HORNED',
    notes: 'Prize winning heifer',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    latest_weight: 550,
    age_in_months: 24,
  },
  {
    id: 'cattle-2',
    name: 'Duke',
    ear_tag: 'A002',
    color: 'RED',
    sex: 'M',
    date_of_birth: '2021-06-20',
    horn_status: 'POLLED',
    mother: 'cattle-1',
    notes: 'Breeding bull',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    latest_weight: 850,
    age_in_months: 30,
  },
  {
    id: 'cattle-3',
    name: 'Daisy',
    ear_tag: 'A003',
    color: 'BLACK_WHITE',
    sex: 'F',
    date_of_birth: '2023-03-10',
    horn_status: 'SCURRED',
    mother: 'cattle-1',
    father: 'cattle-2',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    latest_weight: 350,
    age_in_months: 10,
  },
]

export const mockPhotos: Photo[] = [
  {
    id: 'photo-1',
    cattle: 'cattle-1',
    image: '/media/photos/bessie-1.jpg',
    display_url: '/media/photos/display/bessie-1.jpg',
    thumb_url: '/media/photos/thumb/bessie-1.jpg',
    caption: 'Bessie at the county fair',
    tags: ['show', 'portrait'],
    taken_at: '2024-01-15T14:30:00Z',
    created_at: '2024-01-15T15:00:00Z',
    updated_at: '2024-01-15T15:00:00Z',
  },
  {
    id: 'photo-2',
    cattle: 'cattle-2',
    image: '/media/photos/duke-1.jpg',
    display_url: '/media/photos/display/duke-1.jpg',
    thumb_url: '/media/photos/thumb/duke-1.jpg',
    caption: 'Duke in the pasture',
    tags: ['breeding', 'portrait'],
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-01-10T10:00:00Z',
  },
]

export const mockWeightLogs: WeightLog[] = [
  {
    id: 'log-1',
    cattle: 'cattle-1',
    weight: 550,
    weight_date: '2024-01-15',
    notes: 'Healthy weight gain',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'log-2',
    cattle: 'cattle-1',
    weight: 525,
    weight_date: '2023-12-15',
    created_at: '2023-12-15T10:00:00Z',
    updated_at: '2023-12-15T10:00:00Z',
  },
  {
    id: 'log-3',
    cattle: 'cattle-2',
    weight: 850,
    weight_date: '2024-01-15',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
]

export const mockHerdStats: HerdStatistics = {
  total_cattle: 25,
  color_distribution: [
    { color: 'BLACK', count: 10, percentage: 40 },
    { color: 'RED', count: 8, percentage: 32 },
    { color: 'BLACK_WHITE', count: 5, percentage: 20 },
    { color: 'BROWN', count: 2, percentage: 8 },
  ],
  sex_distribution: [
    { sex: 'F', count: 15, percentage: 60 },
    { sex: 'M', count: 10, percentage: 40 },
  ],
  horn_status_distribution: [
    { horn_status: 'HORNED', count: 12, percentage: 48 },
    { horn_status: 'POLLED', count: 8, percentage: 32 },
    { horn_status: 'SCURRED', count: 3, percentage: 12 },
    { horn_status: 'DEHORNED', count: 2, percentage: 8 },
  ],
  average_age_months: 18.5,
  oldest_cattle: mockCattle[1],
  youngest_cattle: mockCattle[2],
  monthly_births: [
    { month: '2024-01', count: 2 },
    { month: '2023-12', count: 1 },
    { month: '2023-11', count: 3 },
    { month: '2023-10', count: 2 },
    { month: '2023-09', count: 1 },
    { month: '2023-08', count: 0 },
  ],
}
