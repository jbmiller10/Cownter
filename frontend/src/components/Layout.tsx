import React, { useState, useMemo, useCallback } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Pets as PetsIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  PhotoLibrary as PhotoLibraryIcon,
  BarChart as BarChartIcon,
  Scale as ScaleIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useTheme as useCustomTheme } from '../theme/useTheme'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  label: string
  path: string
  icon: React.ReactElement
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Cattle', path: '/cattle', icon: <PetsIcon /> },
  { label: 'Photos', path: '/photos', icon: <PhotoLibraryIcon /> },
  { label: 'Statistics', path: '/stats', icon: <BarChartIcon /> },
  { label: 'Weight Logs', path: '/weight-logs', icon: <ScaleIcon /> },
]

export const Layout: React.FC = () => {
  const { mode, toggleColorMode } = useCustomTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleNavigate = (path: string) => {
    void navigate(path)
    setDrawerOpen(false)
  }

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleUserMenuClose()
    logout()
  }

  const navigationContent = useMemo(
    () => (
      <List>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigate(item.path)}
              aria-label={`Navigate to ${item.label}`}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    ),
    [location.pathname, handleNavigate]
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <PetsIcon sx={{ mr: 2, display: { xs: 'none', md: 'flex' } }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            onClick={() => void navigate('/')}
          >
            Kurten Cowner
          </Typography>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => handleNavigate(item.path)}
                  aria-label={`Navigate to ${item.label}`}
                  sx={{
                    textTransform: 'none',
                    bgcolor:
                      location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          <IconButton
            sx={{ ml: 1 }}
            onClick={toggleColorMode}
            color="inherit"
            aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {user && (
            <>
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{ ml: 1 }}
                color="inherit"
                aria-label="User menu"
              >
                <Avatar sx={{ width: 32, height: 32 }}>
                  {user.username.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleUserMenuClose}>
                <MenuItem disabled>
                  <Typography variant="body2">{user.username}</Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box
          sx={{
            width: 250,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
            }}
          >
            <Typography variant="h6">Menu</Typography>
            <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close navigation menu">
              <CloseIcon />
            </IconButton>
          </Box>
          {navigationContent}
        </Box>
      </Drawer>

      <Container
        component="main"
        maxWidth="lg"
        sx={{
          flexGrow: 1,
          mt: 3,
          mb: 3,
        }}
      >
        <Outlet />
      </Container>
    </Box>
  )
}
