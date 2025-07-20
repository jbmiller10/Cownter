import React, { useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  useHerdStatistics,
  useColorDistribution,
  useBreedDistribution,
  useGrowthStats,
  useCalvesPerYear,
} from '../hooks/useStats'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6384', '#36A2EB']

const StatCard: React.FC<{ title: string; value: string | number; color?: string }> = ({
  title,
  value,
  color,
}) => (
  <Card>
    <CardContent>
      <Typography color="text.secondary" gutterBottom variant="subtitle2">
        {title}
      </Typography>
      <Typography variant="h4" component="div" sx={{ color, fontWeight: 'bold' }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
)

export const StatsPage: React.FC = () => {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const { data: summaryStats, isLoading: summaryLoading, error: summaryError } = useHerdStatistics()
  const { data: colorData, isLoading: colorLoading } = useColorDistribution()
  const { data: breedData, isLoading: breedLoading } = useBreedDistribution()
  const { data: growthData, isLoading: growthLoading } = useGrowthStats(selectedYear)
  const { data: calvesData, isLoading: calvesLoading } = useCalvesPerYear()

  const isLoading = summaryLoading || colorLoading || breedLoading

  if (summaryError) {
    return (
      <Box>
        <Alert severity="error">
          Error loading statistics: {summaryError.message || 'Unknown error'}
        </Alert>
      </Box>
    )
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  // Calculate additional metrics
  const totalActive = summaryStats?.totals.active || 0
  const totalCows = (summaryStats?.bySex.cow || 0) + (summaryStats?.bySex.heifer || 0)
  const totalBulls = (summaryStats?.bySex.bull || 0) + (summaryStats?.bySex.steer || 0)
  const totalCalves = summaryStats?.bySex.calf || 0

  // Prepare chart data
  const colorChartData = colorData?.distribution.slice(0, 7) || []
  const breedChartData = breedData?.distribution || []
  const calvesChartData = calvesData || []
  const growthChartData = growthData?.growthData || []

  // Generate year options for growth stats selector
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i)

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Herd Statistics Dashboard
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Active"
            value={totalActive}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cows"
            value={totalCows}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Bulls"
            value={totalBulls}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Calves"
            value={totalCalves}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Average Age"
            value={`${summaryStats?.avgAge || 0} yrs`}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Color Distribution Pie Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Color Distribution
            </Typography>
            {!colorLoading && colorChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={colorChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.color}: ${entry.percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {colorChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                {colorLoading ? <CircularProgress /> : <Typography>No data available</Typography>}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Breed Mix Horizontal Bar Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Breed Mix
            </Typography>
            {!breedLoading && breedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={breedChartData} 
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="breed" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                {breedLoading ? <CircularProgress /> : <Typography>No data available</Typography>}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Calves Per Year Line Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Calves Per Year (Last 5 Years)
            </Typography>
            {!calvesLoading && calvesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={calvesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Calves Born"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                {calvesLoading ? <CircularProgress /> : <Typography>No data available</Typography>}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Growth Curve Chart with Year Selector */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Growth Curve
              </Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="year-select-label">Cohort Year</InputLabel>
                <Select
                  labelId="year-select-label"
                  id="year-select"
                  value={selectedYear}
                  label="Cohort Year"
                  onChange={(e) => setSelectedYear(e.target.value as number)}
                >
                  {yearOptions.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            {!growthLoading && growthChartData.length > 0 ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {growthData?.cattleCount || 0} cattle in this cohort
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={growthChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="age_months" 
                      label={{ value: 'Age (months)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: number | string, name: string) => [
                        `${value} kg`,
                        name === 'avg_weight' ? 'Average Weight' : name
                      ]}
                      labelFormatter={(label) => `Age: ${label} months`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avg_weight"
                      stroke="#FF8042"
                      strokeWidth={2}
                      name="Average Weight"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280 }}>
                {growthLoading ? (
                  <CircularProgress />
                ) : (
                  <Typography color="text.secondary">
                    {growthData?.cattleCount === 0 
                      ? `No cattle born in ${selectedYear}`
                      : 'No weight data available for this cohort'}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}