import React from 'react'
import { Grid, Card, CardContent, Typography, Box, Paper } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome to Kurten Cowner
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

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cattle Records
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage individual cattle with detailed metadata including color, date of birth, sex,
                and horn status.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Lineage Tracking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track parent-child relationships and breeding history across your herd.
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
              <Typography variant="body2" color="text.secondary">
                Upload and tag photos with automatic EXIF data extraction.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
