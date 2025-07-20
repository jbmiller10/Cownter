import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material'
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridRowParams,
  GridToolbar,
} from '@mui/x-data-grid'
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Archive as ArchiveIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useCattleList, useArchiveCattle } from '../hooks/useCattle'
import { Cattle } from '../types/api'

export const HerdListView: React.FC = () => {
  // Performance monitoring for development
  React.useEffect(() => {
    const startTime = performance.now()
    return () => {
      const renderTime = performance.now() - startTime
      console.log(`HerdListView render time: ${renderTime.toFixed(2)}ms`)
    }
  })
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  })
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedCattleId, setSelectedCattleId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  const { data, isLoading, error } = useCattleList({
    page: paginationModel.page + 1,
    page_size: paginationModel.pageSize,
    search: searchTerm,
  })

  const archiveMutation = useArchiveCattle()

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setPaginationModel({ ...paginationModel, page: 0 })
  }

  const handleRowClick = (params: GridRowParams) => {
    navigate(`/cattle/${params.id}`)
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, cattleId: string) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setSelectedCattleId(cattleId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedCattleId(null)
  }

  const handleArchive = async () => {
    if (!selectedCattleId) return

    try {
      await archiveMutation.mutateAsync(selectedCattleId)
      setSnackbar({ open: true, message: 'Cattle archived successfully', severity: 'success' })
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to archive cattle', severity: 'error' })
    }
    handleMenuClose()
  }

  const getSexLabel = (sex: string): string => {
    const sexLabels: Record<string, string> = {
      M: 'Bull',
      F: 'Cow',
      S: 'Steer',
      H: 'Heifer',
      C: 'Calf',
    }
    return sexLabels[sex] || sex
  }

  const columns: GridColDef[] = [
    {
      field: 'ear_tag',
      headerName: 'Tag',
      width: 100,
      filterable: true,
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 150,
      filterable: true,
    },
    {
      field: 'sex',
      headerName: 'Sex',
      width: 120,
      filterable: true,
      renderCell: (params) => (
        <Chip
          label={getSexLabel(params.value)}
          size="small"
          color={params.value === 'M' ? 'primary' : params.value === 'F' ? 'secondary' : 'default'}
        />
      ),
    },
    {
      field: 'color',
      headerName: 'Color',
      width: 130,
      filterable: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      filterable: true,
      renderCell: (params) => (
        <Chip
          label={params.value || 'active'}
          size="small"
          color={params.value === 'archived' ? 'default' : 'success'}
          variant={params.value === 'archived' ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'date_of_birth',
      headerName: 'DOB',
      width: 120,
      filterable: true,
      valueGetter: (params) => {
        return params.value ? new Date(params.value).toLocaleDateString() : '-'
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params: GridRowParams<Cattle>) => [
        <GridActionsCellItem
          key="menu"
          icon={<MoreVertIcon />}
          label="Menu"
          onClick={(event) => handleMenuOpen(event, params.id as string)}
        />,
      ],
    },
  ]

  const rows = data?.results || []

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Error loading cattle: {error.message || 'Unknown error'}</Alert>
      </Box>
    )
  }

  const EmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 400,
        gap: 2,
      }}
    >
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="80" fill="#f5f5f5" />
        <path
          d="M60 80 Q100 60 140 80"
          stroke="#bdbdbd"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="70" cy="90" r="8" fill="#757575" />
        <circle cx="130" cy="90" r="8" fill="#757575" />
        <path
          d="M80 120 Q100 130 120 120"
          stroke="#bdbdbd"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="85" cy="115" rx="12" ry="8" fill="#e0e0e0" />
        <ellipse cx="115" cy="115" rx="12" ry="8" fill="#e0e0e0" />
      </svg>
      <Typography variant="h6" color="text.secondary">
        No cattle in your herd yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add your first cattle to get started
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/cattle/new')}>
        Add First Cattle
      </Button>
    </Box>
  )

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Herd Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/cattle/new')}>
          Add Cattle
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Quick search by tag, name, color..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <Paper sx={{ flex: 1, display: 'flex' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[5, 10, 25, 50]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          rowCount={data?.count || 0}
          paginationMode="server"
          onRowClick={handleRowClick}
          slots={{
            toolbar: GridToolbar,
            noRowsOverlay: EmptyState,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: false,
            },
          }}
          sx={{
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
            },
          }}
        />
      </Paper>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            navigate(`/cattle/${selectedCattleId}`)
            handleMenuClose()
          }}
        >
          <ViewIcon sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate(`/cattle/${selectedCattleId}/edit`)
            handleMenuClose()
          }}
        >
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={handleArchive}>
          <ArchiveIcon sx={{ mr: 1 }} /> Archive
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}