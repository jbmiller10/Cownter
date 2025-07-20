import React from 'react'
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Paper, 
  Skeleton,
  Button,
  Stack,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useHerdStatistics, useColorDistribution, useBreedDistribution } from '../hooks/useStats'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

const StatCard: React.FC<{ 
  title: string
  value: string | number
  loading?: boolean
  color?: string 
}> = ({ title, value, loading, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography color="text.secondary" gutterBottom variant="subtitle2">
        {title}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width="60%" height={40} />
      ) : (
        <Typography variant="h4" component="div" sx={{ color, fontWeight: 'bold' }}>
          {value}
        </Typography>
      )}
    </CardContent>
  </Card>
)

const MiniPieChart: React.FC<{ 
  data: Array<{ name: string; value: number }>
  title: string
  loading?: boolean 
}> = ({ data, title, loading }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <Skeleton variant="circular" width={150} height={150} />
        </Box>
      ) : data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 5 }}>
          No data available
        </Typography>
      )}
    </CardContent>
  </Card>
)

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading } = useHerdStatistics()
  const { data: colorData, isLoading: colorLoading } = useColorDistribution()
  const { data: breedData, isLoading: breedLoading } = useBreedDistribution()

  // Prepare data for mini charts
  const sexChartData = stats ? [
    { name: 'Cows', value: (stats.bySex.cow || 0) + (stats.bySex.heifer || 0) },
    { name: 'Bulls', value: (stats.bySex.bull || 0) + (stats.bySex.steer || 0) },
    { name: 'Calves', value: stats.bySex.calf || 0 },
  ].filter(item => item.value > 0) : []

  const colorChartData = colorData?.distribution.slice(0, 5).map(item => ({
    name: item.color,
    value: item.count,
  })) || []

  const breedChartData = breedData?.distribution.slice(0, 5).map(item => ({
    name: item.breed,
    value: item.count,
  })) || []

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome to Kurten Cownter
            </Typography>
            {user && (
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Hello, {user.username}!
              </Typography>
            )}
            <Typography variant="body1" color="text.secondary">
              Your cattle herd management system is ready! This application helps you track cattle
              records, manage lineage, upload photos, and generate comprehensive herd statistics.
            </Typography>
          </Paper>
        </Grid>

        {/* Key Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Active Cattle" 
            value={stats?.totals.active || 0}
            loading={statsLoading}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Archived" 
            value={stats?.totals.archived || 0}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Average Age" 
            value={`${stats?.avgAge || 0} yrs`}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Colors" 
            value={colorData?.distribution.length || 0}
            loading={colorLoading}
            color="secondary.main"
          />
        </Grid>

        {/* Mini Charts */}
        <Grid item xs={12} md={4}>
          <MiniPieChart 
            title="Sex Distribution" 
            data={sexChartData}
            loading={statsLoading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MiniPieChart 
            title="Top 5 Colors" 
            data={colorChartData}
            loading={colorLoading}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MiniPieChart 
            title="Top 5 Breeds" 
            data={breedChartData}
            loading={breedLoading}
          />
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button 
                variant="contained" 
                component={RouterLink} 
                to="/cattle"
              >
                View All Cattle
              </Button>
              <Button 
                variant="outlined" 
                component={RouterLink} 
                to="/cattle/new"
              >
                Add New Cattle
              </Button>
              <Button 
                variant="outlined" 
                component={RouterLink} 
                to="/stats"
              >
                View Full Statistics
              </Button>
              <Button 
                variant="outlined" 
                component={RouterLink} 
                to="/photos"
              >
                Browse Photos
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Feature Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cattle Records
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Manage individual cattle with detailed metadata including color, date of birth, sex,
                and horn status.
              </Typography>
              <Button 
                size="small" 
                component={RouterLink} 
                to="/cattle"
              >
                Manage Cattle →
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Lineage Tracking
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Track parent-child relationships and breeding history across your herd.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View lineage details on individual cattle pages.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Photo Management
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload and tag photos with automatic EXIF data extraction.
              </Typography>
              <Button 
                size="small" 
                component={RouterLink} 
                to="/photos"
              >
                Browse Gallery →
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}