import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Typography,
  Alert,
  IconButton,
  Tab,
} from '@mui/material'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { ArrowBack as ArrowBackIcon, Edit as EditIcon } from '@mui/icons-material'
import { useCattle } from '../hooks/useCattle'
import { LineageTree } from '../components/cattle/LineageTree'
import { GrowthChart } from '../components/cattle/GrowthChart'
import { CattlePhotos } from '../components/cattle/CattlePhotos'

export const CattleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tabValue, setTabValue] = React.useState('info')

  const { data: cattle, isLoading, error } = useCattle(id || '')

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue)
  }

  if (isLoading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error || !cattle) {
    return (
      <Box>
        <Alert severity="error">{error?.message || 'Failed to load cattle details'}</Alert>
      </Box>
    )
  }

  const getGenderLabel = (sex: string) => {
    switch (sex) {
      case 'M':
        return 'Bull'
      case 'F':
        return 'Cow'
      default:
        return 'Unknown'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/cattle')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          {cattle.name || cattle.ear_tag}
        </Typography>
        <IconButton onClick={() => navigate(`/cattle/${id}/edit`)}>
          <EditIcon />
        </IconButton>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Ear Tag
              </Typography>
              <Typography variant="h6">{cattle.ear_tag}</Typography>
            </Box>
            {cattle.name && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="h6">{cattle.name}</Typography>
              </Box>
            )}
            <Box>
              <Typography variant="body2" color="text.secondary">
                Date of Birth
              </Typography>
              <Typography variant="h6">{formatDate(cattle.date_of_birth)}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Age
              </Typography>
              <Typography variant="h6">{cattle.age_in_months} months</Typography>
            </Box>
            {cattle.latest_weight && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Latest Weight
                </Typography>
                <Typography variant="h6">{cattle.latest_weight} kg</Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip label={cattle.color} variant="outlined" size="small" />
            <Chip
              label={getGenderLabel(cattle.sex)}
              color={cattle.sex === 'M' ? 'primary' : 'secondary'}
              size="small"
            />
            <Chip label={cattle.horn_status} variant="outlined" size="small" />
            {cattle.status && (
              <Chip
                label={cattle.status}
                color={cattle.status === 'active' ? 'success' : 'default'}
                size="small"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      <TabContext value={tabValue}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <TabList onChange={handleTabChange} aria-label="cattle detail tabs">
            <Tab label="Info" value="info" />
            <Tab label="Photos" value="photos" />
            <Tab label="Growth" value="growth" />
          </TabList>
        </Box>

        <TabPanel value="info" sx={{ px: 0 }}>
          <LineageTree cattleId={id || ''} cattle={cattle} />
          {cattle.notes && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notes
                </Typography>
                <Typography variant="body2" color="text.secondary" whiteSpace="pre-wrap">
                  {cattle.notes}
                </Typography>
              </CardContent>
            </Card>
          )}
        </TabPanel>

        <TabPanel value="photos" sx={{ px: 0 }}>
          <CattlePhotos cattleId={id || ''} />
        </TabPanel>

        <TabPanel value="growth" sx={{ px: 0 }}>
          <GrowthChart cattleId={id || ''} />
        </TabPanel>
      </TabContext>
    </Box>
  )
}
