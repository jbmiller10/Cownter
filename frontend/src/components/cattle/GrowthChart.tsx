import React, { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useCattleWeightHistory, useCreateWeightLog } from '../../hooks/useWeightLogs'
import { useQueryClient } from '@tanstack/react-query'

interface GrowthChartProps {
  cattleId: string
}

export const GrowthChart: React.FC<GrowthChartProps> = ({ cattleId }) => {
  const queryClient = useQueryClient()
  const { data: weightHistory, isLoading } = useCattleWeightHistory(cattleId)
  const createWeightLog = useCreateWeightLog()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [weightData, setWeightData] = useState({
    weight: '',
    weight_date: new Date().toISOString().split('T')[0],
    method: 'scale',
    notes: '',
  })

  const handleDialogOpen = () => {
    setDialogOpen(true)
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setWeightData({
      weight: '',
      weight_date: new Date().toISOString().split('T')[0],
      method: 'scale',
      notes: '',
    })
  }

  const handleSubmit = async () => {
    try {
      await createWeightLog.mutateAsync({
        cattle: cattleId,
        weight: parseFloat(weightData.weight),
        weight_date: weightData.weight_date,
        notes: weightData.notes || undefined,
      })

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['weight-logs', 'cattle', cattleId] })
      queryClient.invalidateQueries({ queryKey: ['cattle', cattleId] })

      handleDialogClose()
    } catch (error) {
      console.error('Failed to create weight log:', error)
    }
  }

  // Format data for Recharts
  const chartData =
    weightHistory
      ?.map((log) => ({
        date: new Date(log.weight_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        weight: log.weight,
        fullDate: log.weight_date,
      }))
      .reverse() || []

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6">Weight History</Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleDialogOpen}
            >
              Add Measurement
            </Button>
          </Box>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => [`${value} kg`, 'Weight']} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ fill: '#8884d8' }}
                  name="Weight (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No weight measurements recorded yet</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>Add Weight Measurement</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Weight (kg)"
              type="number"
              value={weightData.weight}
              onChange={(e) => setWeightData({ ...weightData, weight: e.target.value })}
              fullWidth
              required
              inputProps={{ step: 0.1, min: 0 }}
            />

            <TextField
              label="Date"
              type="date"
              value={weightData.weight_date}
              onChange={(e) => setWeightData({ ...weightData, weight_date: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Method</InputLabel>
              <Select
                value={weightData.method}
                onChange={(e) => setWeightData({ ...weightData, method: e.target.value })}
                label="Method"
              >
                <MenuItem value="scale">Scale</MenuItem>
                <MenuItem value="tape">Weight Tape</MenuItem>
                <MenuItem value="visual">Visual Estimate</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Notes (optional)"
              multiline
              rows={3}
              value={weightData.notes}
              onChange={(e) => setWeightData({ ...weightData, notes: e.target.value })}
              fullWidth
            />
          </Box>

          {createWeightLog.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to add weight measurement. Please try again.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!weightData.weight || createWeightLog.isPending}
          >
            {createWeightLog.isPending ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
