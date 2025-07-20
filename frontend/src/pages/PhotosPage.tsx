import React, { useState, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Fab,
  TextField,
  Autocomplete,
  ImageList,
  ImageListItem,
  IconButton,
  Checkbox,
  FormControlLabel,
  Stack,
  Snackbar,
} from '@mui/material'
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { format, parseISO } from 'date-fns'
import Masonry from 'react-masonry-css'
import {
  usePhotosList as usePhotos,
  useBulkUploadPhotos,
  useDeletePhoto,
  useUpdatePhoto,
  usePhotoTags,
} from '../hooks/usePhotos'
import { useCattleList } from '../hooks/useCattle'
import { Photo } from '../types/api'

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
}

interface PhotoPreview {
  file: File
  url: string
}

export const PhotosPage: React.FC = () => {
  const [filters, setFilters] = useState<{
    tags?: string[]
    startDate?: Date | null
    endDate?: Date | null
    untagged?: boolean
  }>({})

  const { data: photosData, isLoading, error } = usePhotos(filters)
  const { data: cattleData } = useCattleList({ page_size: 100 })
  const { data: existingTags } = usePhotoTags()
  const bulkUploadMutation = useBulkUploadPhotos()
  const deletePhotoMutation = useDeletePhoto()
  const updatePhotoMutation = useUpdatePhoto()

  const photos = useMemo(() => photosData?.results || [], [photosData?.results])
  const cattle = cattleData?.results || []

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<PhotoPreview[]>([])
  const [selectedCattleIds, setSelectedCattleIds] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [photoDetailTags, setPhotoDetailTags] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [filterUntagged, setFilterUntagged] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }))
    setSelectedFiles((prev) => [...prev, ...newPreviews])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith('image/'))
    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }))
    setSelectedFiles((prev) => [...prev, ...newPreviews])
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || selectedCattleIds.length === 0) return

    setIsUploading(true)
    try {
      const uploadPromises = selectedCattleIds.map((cattleId) =>
        bulkUploadMutation.mutateAsync({
          images: selectedFiles.map((p) => p.file),
          cattle: cattleId,
          tags: selectedTags,
        })
      )

      await Promise.all(uploadPromises)
      setSnackbarMessage(`Successfully uploaded ${selectedFiles.length} photos`)
      setSnackbarOpen(true)
      setUploadDialogOpen(false)
      resetUploadState()
    } catch (err) {
      console.error('Upload failed:', err)
      setSnackbarMessage('Upload failed. Please try again.')
      setSnackbarOpen(true)
    } finally {
      setIsUploading(false)
    }
  }

  const resetUploadState = () => {
    selectedFiles.forEach((preview) => URL.revokeObjectURL(preview.url))
    setSelectedFiles([])
    setSelectedCattleIds([])
    setSelectedTags([])
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      try {
        await deletePhotoMutation.mutateAsync(photoId)
        setSnackbarMessage('Photo deleted successfully')
        setSnackbarOpen(true)
      } catch (err) {
        console.error('Delete failed:', err)
        setSnackbarMessage('Failed to delete photo')
        setSnackbarOpen(true)
      }
    }
  }

  const handleUpdatePhotoTags = async () => {
    if (!selectedPhoto) return

    try {
      await updatePhotoMutation.mutateAsync({
        id: selectedPhoto.id,
        tags: photoDetailTags,
      })
      setSnackbarMessage('Tags updated successfully')
      setSnackbarOpen(true)
      setSelectedPhoto(null)
    } catch (err) {
      console.error('Update failed:', err)
      setSnackbarMessage('Failed to update tags')
      setSnackbarOpen(true)
    }
  }

  const applyFilters = () => {
    const newFilters: {
      tags?: string[]
      startDate?: Date | null
      endDate?: Date | null
      untagged?: boolean
    } = {}
    if (startDate && endDate) {
      newFilters.startDate = startDate
      newFilters.endDate = endDate
    }
    if (filterUntagged) {
      newFilters.untagged = true
    }
    setFilters(newFilters)
    setFilterDialogOpen(false)
  }

  const filteredPhotos = useMemo(() => {
    let result = photos

    if (filters.startDate && filters.endDate) {
      result = result.filter((photo) => {
        const photoDate = photo.taken_at ? parseISO(photo.taken_at) : parseISO(photo.created_at)
        return photoDate >= filters.startDate && photoDate <= filters.endDate
      })
    }

    if (filters.untagged) {
      result = result.filter((photo) => !photo.tags || photo.tags.length === 0)
    }

    return result
  }, [photos, filters])

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Error loading photos: {(error as Error).message || 'Unknown error'}
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Photo Gallery
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFilterDialogOpen(true)}
          >
            Filters
          </Button>
        </Stack>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="masonry-grid"
            columnClassName="masonry-grid_column"
          >
            {filteredPhotos.map((photo) => (
              <Card key={photo.id} sx={{ mb: 2 }}>
                <CardMedia
                  component="img"
                  image={photo.thumb_url}
                  alt={photo.caption || 'Cattle photo'}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedPhoto(photo)
                    setPhotoDetailTags(photo.tags || [])
                  }}
                />
                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {photo.taken_at
                      ? format(parseISO(photo.taken_at), 'MMM d, yyyy')
                      : format(parseISO(photo.created_at), 'MMM d, yyyy')}
                  </Typography>
                  {photo.tags && photo.tags.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      {photo.tags.map((tag: string) => (
                        <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Masonry>

          {filteredPhotos.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {filters.untagged || filters.startDate
                  ? 'No photos match the current filters.'
                  : 'No photos uploaded yet. Click the upload button to add photos.'}
              </Typography>
            </Paper>
          )}
        </>
      )}

      <Fab
        color="primary"
        aria-label="upload"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setUploadDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Filter Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Filter Photos</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Stack direction="row" spacing={2}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Stack>
            </LocalizationProvider>
            <FormControlLabel
              control={
                <Checkbox
                  checked={filterUntagged}
                  onChange={(e) => setFilterUntagged(e.target.checked)}
                />
              }
              label="Show only untagged photos"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
          <Button onClick={applyFilters} variant="contained">
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => !isUploading && setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Photos</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                borderStyle: 'dashed',
                borderWidth: 2,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drag and drop images here
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                or
              </Typography>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="photo-upload"
                type="file"
                multiple
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              <label htmlFor="photo-upload">
                <Button variant="contained" component="span" disabled={isUploading}>
                  Choose Files
                </Button>
              </label>
            </Paper>

            {selectedFiles.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Files ({selectedFiles.length})
                </Typography>
                <ImageList sx={{ height: 200 }} cols={4} rowHeight={100}>
                  {selectedFiles.map((preview, index) => (
                    <ImageListItem key={index}>
                      <img
                        src={preview.url}
                        alt={`Preview ${index + 1}`}
                        loading="lazy"
                        style={{ objectFit: 'cover', height: '100%' }}
                      />
                      <IconButton
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                        }}
                        size="small"
                        onClick={() => {
                          URL.revokeObjectURL(preview.url)
                          setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </ImageListItem>
                  ))}
                </ImageList>
              </Box>
            )}

            <Autocomplete
              multiple
              options={cattle}
              getOptionLabel={(option) => `${option.ear_tag} - ${option.name}`}
              value={cattle.filter((c) => selectedCattleIds.includes(c.id))}
              onChange={(_, newValue) => {
                setSelectedCattleIds(newValue.map((c) => c.id))
              }}
              renderInput={(params) => (
                <TextField {...params} label="Select Cattle" placeholder="Choose cattle to tag" />
              )}
              disabled={isUploading}
            />

            <Autocomplete
              multiple
              freeSolo
              options={existingTags || []}
              value={selectedTags}
              onChange={(_, newValue) => setSelectedTags(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Tags" placeholder="Add tags (press Enter to add)" />
              )}
              disabled={isUploading}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={isUploading || selectedFiles.length === 0 || selectedCattleIds.length === 0}
            startIcon={isUploading ? <CircularProgress size={20} /> : <UploadIcon />}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} maxWidth="md" fullWidth>
        {selectedPhoto && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Photo Details</Typography>
                <IconButton onClick={() => setSelectedPhoto(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <img
                src={selectedPhoto.display_url}
                alt={selectedPhoto.caption || 'Cattle photo'}
                style={{ width: '100%', height: 'auto' }}
              />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Uploaded: {format(parseISO(selectedPhoto.created_at), 'PPpp')}
                </Typography>
                {selectedPhoto.taken_at && (
                  <Typography variant="body2" color="text.secondary">
                    Taken: {format(parseISO(selectedPhoto.taken_at), 'PPpp')}
                  </Typography>
                )}
                {selectedPhoto.caption && (
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {selectedPhoto.caption}
                  </Typography>
                )}

                <Box sx={{ mt: 2 }}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={existingTags || []}
                    value={photoDetailTags}
                    onChange={(_, newValue) => setPhotoDetailTags(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Tags" placeholder="Add or remove tags" />
                    )}
                  />
                </Box>

                {selectedPhoto.exif_data && Object.keys(selectedPhoto.exif_data).length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">EXIF Data:</Typography>
                    <Paper variant="outlined" sx={{ p: 1, mt: 1 }}>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {JSON.stringify(selectedPhoto.exif_data, null, 2)}
                      </Typography>
                    </Paper>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                color="error"
                onClick={() => {
                  void handleDeletePhoto(selectedPhoto.id)
                  setSelectedPhoto(null)
                }}
              >
                Delete
              </Button>
              <Button onClick={handleUpdatePhotoTags} variant="contained">
                Save Tags
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      <style>{`
        .masonry-grid {
          display: flex;
          margin-left: -16px;
          width: auto;
        }
        .masonry-grid_column {
          padding-left: 16px;
          background-clip: padding-box;
        }
      `}</style>
    </Box>
  )
}
