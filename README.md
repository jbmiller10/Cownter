# Kurten Cowner

[![Lint & Tests](https://github.com/your-username/kurten-cowner/workflows/lint-test/badge.svg?branch=main)](https://github.com/your-username/kurten-cowner/actions?query=workflow%3Alint-test+branch%3Amain)

A fun-but-functional web application for managing a 20-50 head cattle herd. Track cattle records, lineage, photos with EXIF data, and generate herd statistics dashboards.

## Features

- **CRUD Cattle Records**: Manage individual cattle with metadata (color, DOB, sex, horn status)
- **Lineage Tracking**: Parent-child relationships and breeding history
- **Photo Management**: Upload photos with EXIF extraction and tagging
- **Herd Statistics**: Visual dashboards with charts and analytics
- **Data Export**: Multiple format support for reports

## Tech Stack

- **Backend**: Python 3.12, Django 4.x, Django REST Framework
- **Database**: PostgreSQL 15
- **Frontend**: React 18 (Vite + TypeScript) with Material UI
- **Charts**: Recharts
- **Containerization**: Docker & docker-compose
- **CI/CD**: GitHub Actions

## Prerequisites

- Docker and Docker Compose
- Node.js ≥ 20
- Git

## Quick Start

Clone the repository and start all services with one command:

```bash
git clone <repository-url>
cd kurten-cowner
docker compose up -d
```

The application will be available at:
- **Frontend**: http://localhost:5173 (React dev server)
- **Backend API**: http://localhost:8000 (Django)
- **Database**: PostgreSQL on port 5432

## Development

To stop all services:
```bash
docker compose down
```

To view logs:
```bash
docker compose logs -f
```

## License

MIT - see [LICENSE](LICENSE) file for details.