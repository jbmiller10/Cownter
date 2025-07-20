# Authentication Setup Guide

This guide covers the JWT authentication system implementation for the Cattle Tracker API.

## Overview

The authentication system uses JWT (JSON Web Tokens) via `djangorestframework-simplejwt` with role-based permissions:
- **Admin Group**: Full CRUD access to all resources
- **Viewer Group**: Read-only access (GET requests only)

## Initial Setup

### 1. Token Blacklisting Configuration

The logout functionality requires token blacklisting to be properly configured:

```python
# In settings.py, ensure these apps are in INSTALLED_APPS:
INSTALLED_APPS = [
    # ... other apps
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # Required for logout
    # ...
]
```

After adding the blacklist app, run migrations:
```bash
python manage.py migrate
```

This creates the necessary database tables for tracking blacklisted tokens.

### 2. Create Groups and Default User

Use the management command to set up authentication groups:

```bash
# Create groups only
python manage.py setup_auth

# Create groups and a default admin user
DEFAULT_USER_USERNAME=admin \
DEFAULT_USER_PASSWORD=secure_password \
DEFAULT_USER_EMAIL=admin@example.com \
DEFAULT_USER_GROUP=admin \
python manage.py setup_auth

# Create a viewer user
DEFAULT_USER_USERNAME=viewer \
DEFAULT_USER_PASSWORD=viewer_password \
DEFAULT_USER_EMAIL=viewer@example.com \
DEFAULT_USER_GROUP=viewer \
python manage.py setup_auth
```

Valid group names are: `admin`, `viewer`. Invalid groups default to `viewer`.

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration  
- `POST /api/auth/logout/` - Logout (requires refresh token)
- `POST /api/auth/token/refresh/` - Refresh access token
- `POST /api/auth/token/verify/` - Verify token validity
- `GET/PATCH /api/auth/user/` - Get/update current user

### Example Usage

#### Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "secure_password"}'

# Response:
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "is_staff": true
  }
}
```

#### Authenticated Request
```bash
curl http://localhost:8000/api/cattle/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

#### Logout
```bash
curl -X POST http://localhost:8000/api/auth/logout/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."}'
```

## JWT Settings

The JWT configuration in `settings.py`:

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    # ... other settings
}
```

## Permission Classes

### IsViewerOrAdmin
Applied to all API viewsets. Grants:
- Admin users: Full access (GET, POST, PUT, PATCH, DELETE)
- Viewer users: Read-only access (GET only)
- Unauthenticated: No access (401 Unauthorized)

### IsAdminGroupMember  
Restricts access to admin users only.

### IsOwnerOrAdmin
Allows admins full access and owners to access their own objects.

## Testing

Run authentication tests:
```bash
pytest authentication/tests.py -v
```

The test suite covers:
- Login/logout flows
- Token refresh and verification
- Permission enforcement
- Registration validation

## Security Considerations

1. **Environment Variables**: Never commit credentials. Use environment variables or `.env` files
2. **Token Storage**: Store tokens securely in the frontend (HttpOnly cookies recommended)
3. **HTTPS**: Always use HTTPS in production to protect tokens in transit
4. **Token Expiry**: Configure appropriate token lifetimes based on security requirements
5. **Password Validation**: Django's password validators are applied during registration

## Troubleshooting

### "Invalid token" error on logout
Ensure `rest_framework_simplejwt.token_blacklist` is in `INSTALLED_APPS` and migrations are run.

### 403 Forbidden for admin users
Verify the user is in the admin group and `is_staff=True`.

### Token verification fails
Check that the token hasn't expired and the SECRET_KEY hasn't changed.