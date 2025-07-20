import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import {
  useWeightLogsList,
  useCreateWeightLog,
  useUpdateWeightLog,
  useDeleteWeightLog,
} from '../hooks/useWeightLogs'
import { useCattle } from '../hooks/useCattle'

export const WeightLogsPage: React.FC = () => {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any>(null)
  const [formData, setFormData] = useState({
    cattle_id: '',
    weight: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const { data, isLoading, error } = useWeightLogsList({
    page: page + 1,
    limit: rowsPerPage,
  })
  const createWeightLogMutation = useCreateWeightLog()
  const updateWeightLogMutation = useUpdateWeightLog()
  const deleteWeightLogMutation = useDeleteWeightLog()

  const { data: cattleData } = useCattle({ limit: 100 })

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleOpenDialog = (log?: any) => {
    if (log) {
      setSelectedLog(log)
      setFormData({
        cattle_id: log.cattle.id,
        weight: log.weight.toString(),
        date: log.date,
        notes: log.notes || '',
      })
    } else {
      setSelectedLog(null)
      setFormData({
        cattle_id: '',
        weight: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedLog(null)
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        cattle_id: formData.cattle_id,
        weight: parseFloat(formData.weight),
        date: formData.date,
        notes: formData.notes || null,
      }

      if (selectedLog) {
        await updateWeightLogMutation.mutateAsync({ id: selectedLog.id, data: payload })
      } else {
        await createWeightLogMutation.mutateAsync(payload)
      }
      handleCloseDialog()
    } catch (err) {
      console.error('Failed to save weight log:', err)
    }
  }

  const handleDelete = async (logId: string) => {
    if (window.confirm('Are you sure you want to delete this weight log?')) {
      try {
        await deleteWeightLogMutation.mutateAsync(logId)
      } catch (err) {
        console.error('Failed to delete weight log:', err)
      }
    }
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Error loading weight logs: {error.message || 'Unknown error'}
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Weight Logs
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Add Weight Log
        </Button>
      </Box>

      <TableContainer component={Paper}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Cattle</TableCell>
                  <TableCell>Tag Number</TableCell>
                  <TableCell align="right">Weight (lbs)</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.results?.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                    <TableCell>{log.cattle.name || '-'}</TableCell>
                    <TableCell>{log.cattle.tag_number || '-'}</TableCell>
                    <TableCell align="right">{log.weight}</TableCell>
                    <TableCell>{log.notes || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenDialog(log)} title="Edit">
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(log.id)}
                        title="Delete"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.results || data.results.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        No weight logs found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {data?.results && data.results.length > 0 && (
              <TablePagination
                component="div"
                count={data.count || 0}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            )}
          </>
        )}
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedLog ? 'Edit Weight Log' : 'Add Weight Log'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Cattle</InputLabel>
              <Select
                value={formData.cattle_id}
                onChange={(e) => setFormData({ ...formData, cattle_id: e.target.value })}
                label="Cattle"
              >
                {cattleData?.results?.map((cattle) => (
                  <MenuItem key={cattle.id} value={cattle.id}>
                    {cattle.name || cattle.tag_number || `Cattle ${cattle.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              required
              type="number"
              label="Weight (lbs)"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              inputProps={{ min: 0, step: 0.1 }}
            />

            <TextField
              required
              type="date"
              label="Date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.cattle_id || !formData.weight || !formData.date}
          >
            {selectedLog ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
