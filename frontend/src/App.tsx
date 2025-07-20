import React from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Card,
  CardContent,
  Grid,
} from '@mui/material'
import { Pets as PetsIcon } from '@mui/icons-material'

function App() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <PetsIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Kurten Cowner
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h4" component="h1" gutterBottom>
                  Welcome to Kurten Cowner
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Your cattle herd management system is ready! This application helps you
                  track cattle records, manage lineage, upload photos, and generate
                  comprehensive herd statistics.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Cattle Records
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage individual cattle with detailed metadata including color, date of birth,
                  sex, and horn status.
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
      </Container>
    </Box>
  )
}

export default App