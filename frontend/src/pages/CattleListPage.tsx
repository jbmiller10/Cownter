import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useCattleList } from '../hooks/useCattle'

export const CattleListPage: React.FC = () => {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, error } = useCattleList({
    page: page + 1,
    page_size: rowsPerPage,
    search: searchTerm,
  })

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
    setPage(0)
  }

  const getGenderLabel = (sex: string) => {
    switch (sex) {
      case 'M':
        return 'Bull'
      case 'F':
        return 'Cow'
      case 'S':
        return 'Steer'
      default:
        return 'Unknown'
    }
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">Error loading cattle: {error.message || 'Unknown error'}</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Cattle Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/cattle/new')}>
          Add Cattle
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by name, tag number, or description..."
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
                  <TableCell>Tag Number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Sex</TableCell>
                  <TableCell>Date of Birth</TableCell>
                  <TableCell>Color</TableCell>
                  <TableCell>Horn Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.results?.map((cattle) => (
                  <TableRow key={cattle.id} hover>
                    <TableCell>{cattle.ear_tag || '-'}</TableCell>
                    <TableCell>{cattle.name || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={getGenderLabel(cattle.sex)}
                        size="small"
                        color={
                          cattle.sex === 'M'
                            ? 'primary'
                            : cattle.sex === 'F'
                              ? 'secondary'
                              : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {cattle.date_of_birth
                        ? new Date(cattle.date_of_birth).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>{cattle.color || '-'}</TableCell>
                    <TableCell>
                      <Chip label={cattle.horn_status} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/cattle/${cattle.id}`)}
                        title="View"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/cattle/${cattle.id}/edit`)}
                        title="Edit"
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.results || data.results.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        No cattle found
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
    </Box>
  )
}
