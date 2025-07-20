import React, { useState } from 'react'
import {
  Box,
  Card,
  CardMedia,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Chip,
} from '@mui/material'
import { Masonry } from '@mui/lab'
import { Close as CloseIcon } from '@mui/icons-material'
import { usePhotosList } from '../../hooks/usePhotos'
import { Photo } from '../../types/api'

interface CattlePhotosProps {
  cattleId: string
}

export const CattlePhotos: React.FC<CattlePhotosProps> = ({ cattleId }) => {
  const { data: photosData, isLoading, error } = usePhotosList({ cattle: cattleId })
  const photos = photosData?.results || []
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error">Failed to load photos: {error.message || 'Unknown error'}</Alert>
  }

  if (photos.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="text.secondary">
          No photos have been uploaded for this cattle yet
        </Typography>
      </Box>
    )
  }

  return (
    <>
      <Masonry columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={2}>
        {photos.map((photo) => (
          <Card
            key={photo.id}
            sx={{
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
              },
            }}
            onClick={() => setSelectedPhoto(photo)}
          >
            <CardMedia
              component="img"
              image={photo.thumb_url}
              alt={photo.caption || 'Cattle photo'}
              sx={{
                width: '100%',
                height: 'auto',
              }}
            />
            {photo.caption && (
              <Box sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {photo.caption}
                </Typography>
              </Box>
            )}
          </Card>
        ))}
      </Masonry>

      <Dialog open={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} maxWidth="lg" fullWidth>
        {selectedPhoto && (
          <DialogContent sx={{ position: 'relative', p: 0 }}>
            <IconButton
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
              onClick={() => setSelectedPhoto(null)}
            >
              <CloseIcon />
            </IconButton>

            <img
              src={selectedPhoto.display_url}
              alt={selectedPhoto.caption || 'Cattle photo'}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />

            <Box sx={{ p: 2 }}>
              {selectedPhoto.caption && (
                <Typography variant="body1" gutterBottom>
                  {selectedPhoto.caption}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {selectedPhoto.tags.map((tag: string) => (
                  <Chip key={tag} label={tag} size="small" />
                ))}
              </Box>

              <Typography variant="body2" color="text.secondary">
                {selectedPhoto.taken_at
                  ? `Taken: ${new Date(selectedPhoto.taken_at).toLocaleDateString()}`
                  : `Uploaded: ${new Date(selectedPhoto.created_at).toLocaleDateString()}`}
              </Typography>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
