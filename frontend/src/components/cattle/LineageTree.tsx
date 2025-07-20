import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Grid,
  Paper,
  Divider,
  Chip,
  Stack,
} from '@mui/material'
import { useCattleLineage } from '../../hooks/useCattle'
import { Cattle, CattleBasic } from '../../types/api'
import { Male, Female } from '@mui/icons-material'

interface LineageTreeProps {
  cattleId: string
  cattle: Cattle
}

const CattleCard: React.FC<{
  animal: CattleBasic | null
  title: string
  highlight?: boolean
}> = ({ animal, title, highlight = false }) => {
  if (!animal) {
    return (
      <Paper
        sx={{
          p: 2,
          textAlign: 'center',
          bgcolor: 'grey.100',
          height: '100%',
          minHeight: 90,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Unknown
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      sx={{
        p: 2,
        textAlign: 'center',
        height: '100%',
        minHeight: 90,
        bgcolor: highlight ? 'primary.main' : 'background.paper',
        color: highlight ? 'primary.contrastText' : 'text.primary',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: 3,
        },
      }}
    >
      <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5} mb={0.5}>
        <Typography variant="subtitle2" color={highlight ? 'inherit' : 'text.secondary'}>
          {title}
        </Typography>
        {animal.sex === 'M' ? (
          <Male fontSize="small" />
        ) : (
          <Female fontSize="small" />
        )}
      </Stack>
      <Typography variant="body1" fontWeight="bold">
        {animal.name || animal.ear_tag}
      </Typography>
      <Typography variant="caption" color={highlight ? 'inherit' : 'text.secondary'}>
        {animal.ear_tag}
      </Typography>
      {animal.age_in_months > 0 && (
        <Typography variant="caption" color={highlight ? 'inherit' : 'text.secondary'}>
          {animal.age_in_months} months
        </Typography>
      )}
    </Paper>
  )
}

const RelativesSection: React.FC<{
  title: string
  relatives: CattleBasic[]
  emptyMessage: string
}> = ({ title, relatives, emptyMessage }) => {
  if (relatives.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
        <Chip label={relatives.length} size="small" sx={{ ml: 1 }} />
      </Typography>
      <Grid container spacing={2}>
        {relatives.map((relative) => (
          <Grid item xs={12} sm={6} md={4} key={relative.id}>
            <CattleCard
              animal={relative}
              title={relative.sex === 'M' ? 'Male' : 'Female'}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export const LineageTree: React.FC<LineageTreeProps> = ({ cattleId, cattle }) => {
  const { data: lineageData, isLoading } = useCattleLineage(cattleId)

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={400} />
      </Box>
    )
  }

  if (!lineageData) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Lineage Information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No lineage information available
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const hasGrandparents =
    lineageData.grandparents.paternal_grandfather ||
    lineageData.grandparents.paternal_grandmother ||
    lineageData.grandparents.maternal_grandfather ||
    lineageData.grandparents.maternal_grandmother

  return (
    <Box sx={{ width: '100%' }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Family Tree
          </Typography>

          {/* Grandparents */}
          {hasGrandparents && (
            <>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Grandparents
              </Typography>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Paternal Line
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <CattleCard
                        animal={lineageData.grandparents.paternal_grandfather}
                        title="Grandsire"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <CattleCard
                        animal={lineageData.grandparents.paternal_grandmother}
                        title="Granddam"
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Maternal Line
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <CattleCard
                        animal={lineageData.grandparents.maternal_grandfather}
                        title="Grandsire"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <CattleCard
                        animal={lineageData.grandparents.maternal_grandmother}
                        title="Granddam"
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {/* Parents */}
          <Typography variant="subtitle1" gutterBottom>
            Parents
          </Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6}>
              <CattleCard animal={lineageData.parents.father} title="Sire" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CattleCard animal={lineageData.parents.mother} title="Dam" />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Current Cattle */}
          <Box sx={{ my: 3, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ maxWidth: 300, width: '100%' }}>
              <CattleCard
                animal={{
                  id: cattle.id,
                  ear_tag: cattle.ear_tag,
                  name: cattle.name,
                  sex: cattle.sex,
                  date_of_birth: cattle.date_of_birth,
                  color: cattle.color,
                  breed: cattle.breed,
                  horn_status: cattle.horn_status,
                  age_in_months: cattle.age_in_months,
                  created_at: cattle.created_at,
                  updated_at: cattle.updated_at,
                }}
                title="Current Animal"
                highlight
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Siblings */}
          <Box mb={3}>
            <RelativesSection
              title="Siblings"
              relatives={lineageData.siblings}
              emptyMessage="No siblings recorded"
            />
          </Box>

          {/* Offspring */}
          {lineageData.offspring.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <RelativesSection
                title="Offspring"
                relatives={lineageData.offspring}
                emptyMessage="No offspring recorded"
              />
            </>
          )}

          {/* Summary Stats */}
          <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Generation Depth
                </Typography>
                <Typography variant="h6">
                  {hasGrandparents ? '3 Generations' : '2 Generations'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Known Relatives
                </Typography>
                <Typography variant="h6">
                  {(lineageData.parents.father ? 1 : 0) +
                    (lineageData.parents.mother ? 1 : 0) +
                    (lineageData.grandparents.paternal_grandfather ? 1 : 0) +
                    (lineageData.grandparents.paternal_grandmother ? 1 : 0) +
                    (lineageData.grandparents.maternal_grandfather ? 1 : 0) +
                    (lineageData.grandparents.maternal_grandmother ? 1 : 0) +
                    lineageData.siblings.length +
                    lineageData.offspring.length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Offspring Count
                </Typography>
                <Typography variant="h6">{lineageData.offspring.length}</Typography>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}