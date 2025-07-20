import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
} from '@mui/material'
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { usePhotosList as usePhotos, useUploadPhoto, useDeletePhoto } from '../hooks/usePhotos'

export const PhotosPage: React.FC = () => {
  const { data: photosData, isLoading, error } = usePhotos()
  const uploadPhotoMutation = useUploadPhoto()
  const deletePhotoMutation = useDeletePhoto()
  const photos = photosData?.results
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      await uploadPhotoMutation.mutateAsync({ file })
      setUploadDialogOpen(false)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      try {
        await deletePhotoMutation.mutateAsync(photoId)
      } catch (err) {
        console.error('Delete failed:', err)
      }
    }
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error">Error loading photos: {error.message || 'Unknown error'}</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Photo Gallery
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Photo
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {photos?.map((photo) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
              <Card>
                <CardMedia
                  component="img"
                  height="200"
                  image={photo.thumbnail_url || photo.image_url}
                  alt={photo.description || 'Cattle photo'}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSelectedPhoto(photo)}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(photo.uploaded_at).toLocaleDateString()}
                  </Typography>
                  {photo.cattle_tags && photo.cattle_tags.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {photo.cattle_tags.map((tag: string) => (
                        <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  )}
                </CardContent>
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedPhoto(photo)}
                    title="View details"
                  >
                    <InfoIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeletePhoto(photo.id)}
                    title="Delete photo"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {(!photos || photos.length === 0) && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No photos uploaded yet. Click "Upload Photo" to add your first photo.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog
        open={uploadDialogOpen}
        onClose={() => !isUploading && setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Photo</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="photo-upload"
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            <label htmlFor="photo-upload">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                disabled={isUploading}
                startIcon={isUploading ? <CircularProgress size={20} /> : <UploadIcon />}
              >
                {isUploading ? 'Uploading...' : 'Choose Photo'}
              </Button>
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

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
                src={selectedPhoto.image_url}
                alt={selectedPhoto.description || 'Cattle photo'}
                style={{ width: '100%', height: 'auto' }}
              />
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Uploaded: {new Date(selectedPhoto.uploaded_at).toLocaleString()}
                </Typography>
                {selectedPhoto.description && (
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {selectedPhoto.description}
                  </Typography>
                )}
                {selectedPhoto.exif_data && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">EXIF Data:</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {JSON.stringify(selectedPhoto.exif_data, null, 2)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  )
}
